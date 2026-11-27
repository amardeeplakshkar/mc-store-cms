import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Store } from '@mcstore/db';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { categorySchema, packageSchema, paymentConfigSchema, storeSettingsSchema } from '@mcstore/shared';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { bucketDaily } from '../platform/platform.service';

type PackageInput = z.infer<typeof packageSchema>;

@Injectable()
export class StoreAdminService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private log(store: Store, actorId: string, action: string, entity: string, entityId?: string, data?: unknown) {
    return this.audit.log({ actorId, storeId: store.id, action, entity, entityId, data });
  }

  async getStore(s: Store) {
    const { pluginKeyHash, ...rest } = s;
    return { ...rest, commissionPercent: Number(s.commissionPercent), pluginConnected: !!pluginKeyHash };
  }

  async updateSettings(s: Store, input: z.infer<typeof storeSettingsSchema>, actorId: string) {
    const store = await this.prisma.store.update({ where: { id: s.id }, data: { ...input, settings: input.settings ?? undefined } });
    await this.log(s, actorId, 'store.settings.update', 'Store', s.id, input);
    return this.getStore(store);
  }

  async setDiscount(s: Store, discountPercent: number, actorId: string) {
    await this.prisma.store.update({ where: { id: s.id }, data: { discountPercent } });
    await this.log(s, actorId, 'store.discount.set', 'Store', s.id, { from: s.discountPercent, to: discountPercent });
    return { discountPercent };
  }

  /** Plugin key is shown once. Format: <storeId>.<secret> */
  async rotatePluginKey(s: Store, actorId: string) {
    const key = `${s.id}.${randomBytes(24).toString('hex')}`;
    await this.prisma.store.update({ where: { id: s.id }, data: { pluginKeyHash: createHash('sha256').update(key).digest('hex') } });
    await this.log(s, actorId, 'store.plugin_key.rotate', 'Store', s.id);
    return { key };
  }

  async stats(s: Store) {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [byStatus, totals, recent, top, customers, newCustomers] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], where: { storeId: s.id }, _count: true }),
      this.prisma.order.aggregate({ where: { storeId: s.id, status: 'SUCCESSFUL' }, _sum: { storeAmountPaise: true, platformFeePaise: true }, _count: true }),
      this.prisma.order.findMany({ where: { storeId: s.id, status: 'SUCCESSFUL', verifiedAt: { gte: since } }, select: { verifiedAt: true, storeAmountPaise: true, platformFeePaise: true } }),
      this.prisma.orderItem.groupBy({ by: ['packageId', 'nameSnap'], where: { order: { storeId: s.id, status: 'SUCCESSFUL' } }, _sum: { quantity: true, pricePaise: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
      this.prisma.storeCustomer.count({ where: { storeId: s.id } }),
      this.prisma.storeCustomer.count({ where: { storeId: s.id, createdAt: { gte: since } } }),
    ]);
    return {
      ordersByStatus: Object.fromEntries(byStatus.map((x) => [x.status, x._count])),
      successfulOrders: totals._count,
      revenuePaise: totals._sum.storeAmountPaise ?? 0,
      platformFeesPaise: totals._sum.platformFeePaise ?? 0,
      customers,
      newCustomers30d: newCustomers,
      topPackages: top.map((t) => ({ packageId: t.packageId, name: t.nameSnap, sold: t._sum.quantity ?? 0 })),
      daily: bucketDaily(recent.map((r) => ({ date: r.verifiedAt!, gross: r.storeAmountPaise, commission: r.platformFeePaise }))),
    };
  }

  // ----- categories
  listCategories(s: Store) {
    return this.prisma.category.findMany({ where: { storeId: s.id }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { packages: true } } } });
  }

  async createCategory(s: Store, input: z.infer<typeof categorySchema>, actorId: string) {
    const c = await this.prisma.category.create({ data: { ...input, storeId: s.id } });
    await this.log(s, actorId, 'category.create', 'Category', c.id, input);
    return c;
  }

  async updateCategory(s: Store, id: string, input: z.infer<typeof categorySchema>, actorId: string) {
    await this.ensure(this.prisma.category.findFirst({ where: { id, storeId: s.id } }));
    const c = await this.prisma.category.update({ where: { id }, data: input });
    await this.log(s, actorId, 'category.update', 'Category', id, input);
    return c;
  }

  async deleteCategory(s: Store, id: string, actorId: string) {
    await this.ensure(this.prisma.category.findFirst({ where: { id, storeId: s.id } }));
    if (await this.prisma.package.count({ where: { categoryId: id } })) throw new BadRequestException('Move or delete the packages in this category first');
    await this.prisma.category.delete({ where: { id } });
    await this.log(s, actorId, 'category.delete', 'Category', id);
    return { ok: true };
  }

  // ----- packages
  listPackages(s: Store) {
    return this.prisma.package.findMany({ where: { storeId: s.id }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], include: { category: true } });
  }

  async getPackage(s: Store, id: string) {
    return this.ensure(this.prisma.package.findFirst({ where: { id, storeId: s.id }, include: { category: true } }));
  }

  private toData(input: PackageInput) {
    const { priceRupees, ...rest } = input;
    return { ...rest, pricePaise: Math.round(priceRupees * 100), durationDays: input.durationType === 'DAYS' ? input.durationDays : null };
  }

  async createPackage(s: Store, input: PackageInput, actorId: string) {
    await this.ensure(this.prisma.category.findFirst({ where: { id: input.categoryId, storeId: s.id } }), 'Category not found');
    const p = await this.prisma.package.create({ data: { ...this.toData(input), storeId: s.id } });
    await this.log(s, actorId, 'package.create', 'Package', p.id, { name: p.name, pricePaise: p.pricePaise });
    return p;
  }

  async updatePackage(s: Store, id: string, input: PackageInput, actorId: string) {
    const before = await this.ensure(this.prisma.package.findFirst({ where: { id, storeId: s.id } }));
    await this.ensure(this.prisma.category.findFirst({ where: { id: input.categoryId, storeId: s.id } }), 'Category not found');
    const p = await this.prisma.package.update({ where: { id }, data: this.toData(input) });
    await this.log(s, actorId, 'package.update', 'Package', id, { before: { name: before.name, pricePaise: before.pricePaise, commands: before.commands }, after: { name: p.name, pricePaise: p.pricePaise, commands: p.commands } });
    return p;
  }

  async togglePackage(s: Store, id: string, isEnabled: boolean, actorId: string) {
    await this.ensure(this.prisma.package.findFirst({ where: { id, storeId: s.id } }));
    const p = await this.prisma.package.update({ where: { id }, data: { isEnabled } });
    await this.log(s, actorId, isEnabled ? 'package.enable' : 'package.disable', 'Package', id);
    return p;
  }

  async deletePackage(s: Store, id: string, actorId: string) {
    await this.ensure(this.prisma.package.findFirst({ where: { id, storeId: s.id } }));
    if (await this.prisma.orderItem.count({ where: { packageId: id } })) {
      // keep order history intact: disable instead of delete
      await this.prisma.package.update({ where: { id }, data: { isEnabled: false } });
      await this.log(s, actorId, 'package.disable', 'Package', id, { reason: 'has orders' });
      return { ok: true, disabled: true, message: 'Package has orders, so it was disabled instead of deleted' };
    }
    await this.prisma.package.delete({ where: { id } });
    await this.log(s, actorId, 'package.delete', 'Package', id);
    return { ok: true };
  }

  // ----- payment config
  async getPayment(s: Store) {
    return (await this.prisma.paymentConfig.findUnique({ where: { storeId: s.id } })) ?? { storeId: s.id };
  }

  async setPayment(s: Store, input: z.infer<typeof paymentConfigSchema>, actorId: string) {
    const p = await this.prisma.paymentConfig.upsert({ where: { storeId: s.id }, update: input, create: { ...input, storeId: s.id } });
    await this.log(s, actorId, 'payment_config.update', 'PaymentConfig', p.id, { ...input, accountNumber: input.accountNumber ? '***' : input.accountNumber });
    return p;
  }

  async redeliver(s: Store, orderId: string, actorId: string) {
    const order = await this.ensure(this.prisma.order.findFirst({ where: { id: orderId, storeId: s.id } }));
    if (order.status !== 'SUCCESSFUL') throw new BadRequestException('Only successful orders can be re-delivered');
    const r = await this.prisma.delivery.updateMany({ where: { orderId, status: 'FAILED' }, data: { status: 'QUEUED', attempts: 0, runAfter: new Date(), lastError: null } });
    await this.log(s, actorId, 'order.redeliver', 'Order', orderId, { requeued: r.count });
    return { requeued: r.count };
  }

  // ----- customers
  async listCustomers(s: Store, q: string | undefined, page: number) {
    const where = {
      storeId: s.id,
      ...(q ? { player: { OR: [{ mcUsername: { contains: q, mode: 'insensitive' as const } }, { mcUuid: { contains: q, mode: 'insensitive' as const } }, { displayName: { contains: q, mode: 'insensitive' as const } }] } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.storeCustomer.findMany({
        where,
        include: { player: true, _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 25,
        take: 25,
      }),
      this.prisma.storeCustomer.count({ where }),
    ]);
    const spend = await this.prisma.order.groupBy({ by: ['customerId'], where: { customerId: { in: items.map((i) => i.id) }, status: 'SUCCESSFUL' }, _sum: { totalPaise: true } });
    return {
      items: items.map((c) => ({ ...c, spentPaise: spend.find((x) => x.customerId === c.id)?._sum.totalPaise ?? 0 })),
      total,
      page,
      pageSize: 25,
    };
  }

  async getCustomer(s: Store, id: string) {
    return this.ensure(
      this.prisma.storeCustomer.findFirst({
        where: { id, storeId: s.id },
        include: { player: true, orders: { orderBy: { createdAt: 'desc' }, include: { items: true } } },
      }),
    );
  }

  private async ensure<T>(p: Promise<T | null>, msg = 'Not found'): Promise<T> {
    const v = await p;
    if (!v) throw new NotFoundException(msg);
    return v;
  }
}
