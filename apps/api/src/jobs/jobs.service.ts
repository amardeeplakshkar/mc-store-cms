import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { renderCommand } from '../common/orders.service';

@Injectable()
export class JobsService {
  private log = new Logger(JobsService.name);
  constructor(private prisma: PrismaService) {}

  /** Cancel orders that never received a payment reference. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cancelStalePending() {
    const ttl = Number(process.env.PENDING_ORDER_TTL_HOURS ?? 24);
    const r = await this.prisma.order.updateMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - ttl * 3600_000) } },
      data: { status: 'CANCELLED', adminNote: 'Auto-cancelled: no payment reference submitted' },
    });
    if (r.count) this.log.log(`Auto-cancelled ${r.count} stale orders`);
  }

  /** Queue expiry commands for timed packages. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePackages() {
    const items = await this.prisma.orderItem.findMany({
      where: { expired: false, expiresAt: { lte: new Date() }, order: { status: 'SUCCESSFUL' } },
      include: { package: true, order: true },
      take: 200,
    });
    for (const item of items) {
      await this.prisma.$transaction([
        this.prisma.delivery.createMany({
          data: item.package.expiryCommands.map((cmd) => ({
            storeId: item.order.storeId,
            orderId: item.orderId,
            command: renderCommand(cmd, item.order),
            mcUsername: item.order.mcUsername,
            mcUuid: item.order.mcUuid,
            requireOnline: false,
          })),
        }),
        this.prisma.orderItem.update({ where: { id: item.id }, data: { expired: true } }),
      ]);
    }
    if (items.length) this.log.log(`Queued expiry for ${items.length} items`);
  }
}
