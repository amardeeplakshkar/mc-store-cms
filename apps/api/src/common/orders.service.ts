import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@mcstore/db';
import { ORDER_STATUS_LABEL, OrderQuery, OrderStatusT } from '@mcstore/shared';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';

export const orderInclude = {
  items: true,
  store: { select: { id: true, slug: true, name: true } },
  customer: { include: { player: { select: { id: true, displayName: true, email: true, mcUsername: true, mcUuid: true, mcVerified: true } } } },
  deliveries: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  buildWhere(q: Partial<OrderQuery>, storeId?: string): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (storeId) where.storeId = storeId;
    else if (q.storeId) where.storeId = q.storeId;
    if (q.status) where.status = q.status;
    if (q.from || q.to) where.createdAt = { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined };
    if (q.q) {
      where.OR = [
        { number: { contains: q.q, mode: 'insensitive' } },
        { mcUsername: { contains: q.q, mode: 'insensitive' } },
        { mcUuid: { contains: q.q, mode: 'insensitive' } },
        { txnReference: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(q: OrderQuery, storeId?: string) {
    const where = this.buildWhere(q, storeId);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true, store: { select: { slug: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async get(id: string, storeId?: string) {
    const order = await this.prisma.order.findFirst({ where: { id, ...(storeId ? { storeId } : {}) }, include: orderInclude });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Mark an order paid: snapshot expiries and queue delivery commands. */
  async verify(id: string, storeId: string, actorId: string, note?: string | null) {
    const order = await this.prisma.order.findFirst({ where: { id, storeId }, include: { items: { include: { package: true } } } });
    if (!order) throw new NotFoundException('Order not found');
    if (!['PENDING', 'AWAITING_VERIFICATION', 'FAILED'].includes(order.status)) {
      throw new BadRequestException(`Cannot verify an order that is ${ORDER_STATUS_LABEL[order.status as OrderStatusT]}`);
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const pkg = item.package;
        let expiresAt: Date | null = null;
        if (pkg.durationType === 'MONTHLY') expiresAt = new Date(now.getTime() + 30 * 86400_000 * item.quantity);
        if (pkg.durationType === 'DAYS' && pkg.durationDays) expiresAt = new Date(now.getTime() + pkg.durationDays * 86400_000 * item.quantity);
        await tx.orderItem.update({ where: { id: item.id }, data: { expiresAt } });

        const repeat = pkg.durationType === 'PERMANENT' ? item.quantity : 1;
        const rows = [];
        for (let i = 0; i < repeat; i++) {
          for (const cmd of pkg.commands) {
            rows.push({
              storeId,
              orderId: order.id,
              command: renderCommand(cmd, order),
              mcUsername: order.mcUsername,
              mcUuid: order.mcUuid,
              requireOnline: pkg.requireOnline,
            });
          }
        }
        if (rows.length) await tx.delivery.createMany({ data: rows });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'SUCCESSFUL', verifiedAt: now, verifiedById: actorId, adminNote: note ?? order.adminNote },
      });
    });
    await this.audit.log({ actorId, storeId, action: 'order.verify', entity: 'Order', entityId: id, data: { number: order.number } });
    return this.get(id, storeId);
  }

  async updateStatus(id: string, storeId: string, actorId: string, status: OrderStatusT, note?: string | null) {
    if (status === 'SUCCESSFUL') return this.verify(id, storeId, actorId, note);
    const order = await this.prisma.order.findFirst({ where: { id, storeId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: { status, adminNote: note ?? order.adminNote } }),
      // stop any not-yet-executed deliveries if an order is reversed
      ...(status === 'FAILED' || status === 'CANCELLED'
        ? [this.prisma.delivery.updateMany({ where: { orderId: id, status: 'QUEUED' }, data: { status: 'FAILED', lastError: `Order ${status.toLowerCase()}` } })]
        : []),
    ]);
    await this.audit.log({ actorId, storeId, action: 'order.status', entity: 'Order', entityId: id, data: { from: order.status, to: status, note } });
    return this.get(id, storeId);
  }

  async exportCsv(q: Partial<OrderQuery>, storeId?: string): Promise<string> {
    const rows = await this.prisma.order.findMany({
      where: this.buildWhere(q, storeId),
      include: { items: true, store: { select: { slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50_000,
    });
    const header = ['order_number', 'store', 'created_at', 'status', 'minecraft_username', 'minecraft_uuid', 'items', 'subtotal_inr', 'discount_inr', 'store_amount_inr', 'platform_fee_inr', 'total_inr', 'txn_reference', 'verified_at'];
    const lines = [header.join(',')];
    for (const o of rows) {
      lines.push(
        [
          o.number, o.store.slug, o.createdAt.toISOString(), o.status, o.mcUsername, o.mcUuid ?? '',
          o.items.map((i) => `${i.nameSnap} x${i.quantity}`).join(' | '),
          rupees(o.subtotalPaise), rupees(o.discountPaise), rupees(o.storeAmountPaise), rupees(o.platformFeePaise), rupees(o.totalPaise),
          o.txnReference ?? '', o.verifiedAt?.toISOString() ?? '',
        ].map(csvCell).join(','),
      );
    }
    return lines.join('\n');
  }
}

export function renderCommand(cmd: string, o: { mcUsername: string; mcUuid: string | null; number: string }) {
  return cmd
    .replace(/^\//, '')
    .replace(/\{username\}/g, o.mcUsername)
    .replace(/\{uuid\}/g, o.mcUuid ?? o.mcUsername)
    .replace(/\{order\}/g, o.number);
}

const rupees = (p: number) => (p / 100).toFixed(2);
function csvCell(v: string) {
  const s = String(v ?? '');
  // neutralise spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
