import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { RESERVED_SLUGS, createAdminSchema, createStoreSchema, settlementSchema, updateAdminSchema, updateStorePlatformSchema } from '@mcstore/shared';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async listStores(q?: string) {
    const stores = await this.prisma.store.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true, packages: true, customers: true } } },
    });
    const agg = await this.prisma.order.groupBy({
      by: ['storeId'],
      where: { status: 'SUCCESSFUL' },
      _sum: { storeAmountPaise: true, platformFeePaise: true, totalPaise: true },
      _count: true,
    });
    const unsettled = await this.prisma.order.groupBy({ by: ['storeId'], where: { status: 'SUCCESSFUL', settlementId: null }, _sum: { platformFeePaise: true } });
    return stores.map((s) => {
      const a = agg.find((x) => x.storeId === s.id);
      return {
        ...s,
        commissionPercent: Number(s.commissionPercent),
        stats: {
          successfulOrders: a?._count ?? 0,
          storeRevenuePaise: a?._sum.storeAmountPaise ?? 0,
          commissionPaise: a?._sum.platformFeePaise ?? 0,
          grossPaise: a?._sum.totalPaise ?? 0,
          commissionDuePaise: unsettled.find((x) => x.storeId === s.id)?._sum.platformFeePaise ?? 0,
        },
      };
    });
  }

  /** Built-in reserved slugs plus the super-admin editable `reservedSlugs` list. */
  async assertSlugAvailable(slug: string) {
    const row = await this.prisma.globalConfig.findUnique({ where: { key: 'reservedSlugs' } });
    const extra = Array.isArray(row?.value) ? (row!.value as string[]).map((v) => String(v).toLowerCase()) : [];
    if (RESERVED_SLUGS.includes(slug) || extra.includes(slug)) throw new BadRequestException(`"${slug}" is a reserved word and cannot be used as a store address`);
  }

  async createStore(input: z.infer<typeof createStoreSchema>, actorId: string) {
    await this.assertSlugAvailable(input.slug);
    const cfg = await this.prisma.globalConfig.findUnique({ where: { key: 'defaultCommissionPercent' } });
    const commissionPercent = input.commissionPercent ?? Number(cfg?.value ?? 5);
    const store = await this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          slug: input.slug,
          name: input.name,
          description: input.description,
          commissionPercent,
          payment: { create: {} },
          categories: {
            create: [
              { name: 'Ranks', type: 'RANK', sort: 0 },
              { name: 'Crates', type: 'CRATE', sort: 1 },
              { name: 'Coins', type: 'COIN', sort: 2 },
              { name: 'Other Items', type: 'OTHER', sort: 3 },
            ],
          },
        },
      });
      if (input.ownerEmail) {
        const email = input.ownerEmail.toLowerCase();
        let owner = await tx.admin.findUnique({ where: { email } });
        if (!owner) {
          if (!input.ownerPassword) throw new BadRequestException('Owner password is required for a new admin');
          owner = await tx.admin.create({ data: { email, passwordHash: await bcrypt.hash(input.ownerPassword, 10) } });
        }
        await tx.storeMember.create({ data: { storeId: store.id, adminId: owner.id, role: 'OWNER' } });
      }
      return store;
    });
    await this.audit.log({ actorId, storeId: store.id, action: 'store.create', entity: 'Store', entityId: store.id, data: { slug: store.slug } });
    return store;
  }

  async getStore(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        members: { include: { admin: { select: { id: true, email: true, name: true, isActive: true } } } },
        settlements: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { orders: true, packages: true, customers: true } },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    const [due, earned] = await Promise.all([
      this.prisma.order.aggregate({ where: { storeId: id, status: 'SUCCESSFUL', settlementId: null }, _sum: { platformFeePaise: true }, _count: true }),
      this.prisma.order.aggregate({ where: { storeId: id, status: 'SUCCESSFUL' }, _sum: { platformFeePaise: true, storeAmountPaise: true } }),
    ]);
    return {
      ...store,
      pluginKeyHash: undefined,
      pluginConnected: !!store.pluginKeyHash,
      commissionPercent: Number(store.commissionPercent),
      commission: {
        duePaise: due._sum.platformFeePaise ?? 0,
        dueOrders: due._count,
        earnedPaise: earned._sum.platformFeePaise ?? 0,
        storeRevenuePaise: earned._sum.storeAmountPaise ?? 0,
      },
    };
  }

  async updateStore(id: string, input: z.infer<typeof updateStorePlatformSchema>, actorId: string) {
    const before = await this.prisma.store.findUniqueOrThrow({ where: { id } });
    const store = await this.prisma.store.update({ where: { id }, data: input });
    const action = input.isEnabled === undefined || input.isEnabled === before.isEnabled ? 'store.update' : input.isEnabled ? 'store.enable' : 'store.disable';
    await this.audit.log({
      actorId, storeId: id, action, entity: 'Store', entityId: id,
      data: { before: { name: before.name, isEnabled: before.isEnabled, commissionPercent: Number(before.commissionPercent) }, after: input },
    });
    return { ...store, commissionPercent: Number(store.commissionPercent) };
  }

  async deleteStore(id: string, actorId: string) {
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id } });
    // Packages restrict deletion through order items; remove orders first in one transaction.
    await this.prisma.$transaction([
      this.prisma.order.deleteMany({ where: { storeId: id } }),
      this.prisma.package.deleteMany({ where: { storeId: id } }),
      this.prisma.store.delete({ where: { id } }),
    ]);
    await this.audit.log({ actorId, action: 'store.delete', entity: 'Store', entityId: id, data: { slug: store.slug, name: store.name } });
    return { ok: true };
  }

  async addMember(storeId: string, adminId: string, role: 'OWNER' | 'STAFF', actorId: string) {
    const m = await this.prisma.storeMember.upsert({
      where: { storeId_adminId: { storeId, adminId } },
      update: { role },
      create: { storeId, adminId, role },
    });
    await this.audit.log({ actorId, storeId, action: 'store.member.add', entity: 'Admin', entityId: adminId, data: { role } });
    return m;
  }

  async removeMember(storeId: string, adminId: string, actorId: string) {
    await this.prisma.storeMember.delete({ where: { storeId_adminId: { storeId, adminId } } });
    await this.audit.log({ actorId, storeId, action: 'store.member.remove', entity: 'Admin', entityId: adminId });
    return { ok: true };
  }

  /** Record that the store paid the platform its commission for all currently unsettled orders. */
  async createSettlement(storeId: string, input: z.infer<typeof settlementSchema>, actorId: string) {
    const due = await this.prisma.order.findMany({ where: { storeId, status: 'SUCCESSFUL', settlementId: null }, select: { id: true, platformFeePaise: true } });
    if (!due.length) throw new BadRequestException('No unsettled commission');
    const total = due.reduce((s, o) => s + o.platformFeePaise, 0);
    const settlement = await this.prisma.$transaction(async (tx) => {
      const st = await tx.settlement.create({ data: { storeId, amountPaise: input.amountPaise ?? total, reference: input.reference, note: input.note } });
      await tx.order.updateMany({ where: { id: { in: due.map((o) => o.id) } }, data: { settlementId: st.id } });
      return st;
    });
    await this.audit.log({ actorId, storeId, action: 'settlement.create', entity: 'Settlement', entityId: settlement.id, data: { amountPaise: settlement.amountPaise, orders: due.length } });
    return settlement;
  }

  listAdmins() {
    return this.prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, isSuperAdmin: true, isActive: true, createdAt: true, memberships: { include: { store: { select: { id: true, slug: true, name: true } } } } },
    });
  }

  async createAdmin(input: z.infer<typeof createAdminSchema>, actorId: string) {
    const admin = await this.prisma.admin.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, 10),
        isSuperAdmin: input.isSuperAdmin ?? false,
        memberships: input.storeId ? { create: { storeId: input.storeId, role: input.role ?? 'STAFF' } } : undefined,
      },
      select: { id: true, email: true, name: true, isSuperAdmin: true },
    });
    await this.audit.log({ actorId, storeId: input.storeId, action: 'admin.create', entity: 'Admin', entityId: admin.id, data: { email: admin.email } });
    return admin;
  }

  async updateAdmin(id: string, input: z.infer<typeof updateAdminSchema>, actorId: string) {
    if (id === actorId && input.isActive === false) throw new BadRequestException('You cannot deactivate yourself');
    const admin = await this.prisma.admin.update({
      where: { id },
      data: { name: input.name, isActive: input.isActive, passwordHash: input.password ? await bcrypt.hash(input.password, 10) : undefined },
      select: { id: true, email: true, name: true, isActive: true },
    });
    await this.audit.log({ actorId, action: 'admin.update', entity: 'Admin', entityId: id, data: { ...input, password: input.password ? '***' : undefined } });
    return admin;
  }

  async deleteAdmin(id: string, actorId: string) {
    if (id === actorId) throw new BadRequestException('You cannot delete yourself');
    await this.prisma.admin.delete({ where: { id } });
    await this.audit.log({ actorId, action: 'admin.delete', entity: 'Admin', entityId: id });
    return { ok: true };
  }

  async stats() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [stores, enabled, players, byStatus, totals, due, recent] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.store.count({ where: { isEnabled: true } }),
      this.prisma.player.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      this.prisma.order.aggregate({ where: { status: 'SUCCESSFUL' }, _sum: { totalPaise: true, storeAmountPaise: true, platformFeePaise: true }, _count: true }),
      this.prisma.order.aggregate({ where: { status: 'SUCCESSFUL', settlementId: null }, _sum: { platformFeePaise: true } }),
      this.prisma.order.findMany({ where: { status: 'SUCCESSFUL', verifiedAt: { gte: since } }, select: { verifiedAt: true, totalPaise: true, platformFeePaise: true } }),
    ]);
    return {
      stores,
      enabledStores: enabled,
      players,
      ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      successfulOrders: totals._count,
      grossPaise: totals._sum.totalPaise ?? 0,
      storeRevenuePaise: totals._sum.storeAmountPaise ?? 0,
      commissionPaise: totals._sum.platformFeePaise ?? 0,
      commissionDuePaise: due._sum.platformFeePaise ?? 0,
      daily: bucketDaily(recent.map((r) => ({ date: r.verifiedAt!, gross: r.totalPaise, commission: r.platformFeePaise }))),
    };
  }

  async auditLogs(storeId: string | undefined, page: number) {
    const where = storeId ? { storeId } : {};
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 50, take: 50, include: { actor: { select: { email: true, name: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize: 50 };
  }

  getConfig() {
    return this.prisma.globalConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async setConfig(key: string, value: unknown, actorId: string) {
    const row = await this.prisma.globalConfig.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
    await this.audit.log({ actorId, action: 'config.set', entity: 'GlobalConfig', entityId: key, data: { value } });
    return row;
  }
}

export function bucketDaily(rows: { date: Date; gross: number; commission: number }[], days = 30) {
  const map = new Map<string, { date: string; gross: number; commission: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    map.set(d, { date: d, gross: 0, commission: 0, orders: 0 });
  }
  for (const r of rows) {
    const b = map.get(r.date.toISOString().slice(0, 10));
    if (b) {
      b.gross += r.gross;
      b.commission += r.commission;
      b.orders += 1;
    }
  }
  return [...map.values()];
}
