import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Store } from '@mcstore/db';
import { calculatePrice, discountedPrice } from '@mcstore/shared';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaService) {}

  private publicStore(s: Store) {
    return {
      slug: s.slug,
      name: s.name,
      description: s.description,
      logoUrl: s.logoUrl,
      serverName: s.serverName,
      serverIp: s.serverIp,
      supportInfo: s.supportInfo,
      discountPercent: s.discountPercent,
      commissionPercent: Number(s.commissionPercent),
      requireVerifiedUsername: s.requireVerifiedUsername,
      settings: s.settings,
    };
  }

  private pkgView(s: Store, p: any) {
    return {
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      durationType: p.durationType,
      durationDays: p.durationDays,
      pricePaise: p.pricePaise,
      finalPricePaise: discountedPrice(p.pricePaise, s.discountPercent),
    };
  }

  async catalog(s: Store) {
    const categories = await this.prisma.category.findMany({
      where: { storeId: s.id },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      include: { packages: { where: { isEnabled: true }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] } },
    });
    return {
      store: this.publicStore(s),
      categories: categories.filter((c) => c.packages.length).map((c) => ({ id: c.id, name: c.name, type: c.type, packages: c.packages.map((p) => this.pkgView(s, p)) })),
    };
  }

  async package(s: Store, id: string) {
    const p = await this.prisma.package.findFirst({ where: { id, storeId: s.id, isEnabled: true }, include: { category: true } });
    if (!p) throw new NotFoundException('Package not found');
    const price = calculatePrice([{ pricePaise: p.pricePaise }], s.discountPercent, Number(s.commissionPercent));
    return { store: this.publicStore(s), package: { ...this.pkgView(s, p), category: { name: p.category.name, type: p.category.type } }, price };
  }

  private async customer(s: Store, playerId: string) {
    return this.prisma.storeCustomer.upsert({
      where: { storeId_playerId: { storeId: s.id, playerId } },
      update: {},
      create: { storeId: s.id, playerId },
      include: { player: true },
    });
  }

  async me(s: Store, playerId: string) {
    const c = await this.customer(s, playerId);
    const { linkCode, linkCodeExpiresAt, ...player } = c.player;
    const linkActive = linkCode && linkCodeExpiresAt && linkCodeExpiresAt > new Date();
    return { customerId: c.id, player, linkCode: linkActive ? linkCode : null, linkCodeExpiresAt: linkActive ? linkCodeExpiresAt : null };
  }

  async setUsername(s: Store, playerId: string, mcUsername: string) {
    const current = await this.prisma.player.findUniqueOrThrow({ where: { id: playerId } });
    const changed = current.mcUsername?.toLowerCase() !== mcUsername.toLowerCase();
    await this.prisma.player.update({
      where: { id: playerId },
      data: changed ? { mcUsername, mcUuid: null, mcVerified: false } : { mcUsername },
    });
    if (changed) await this.newLinkCode(s, playerId);
    return this.me(s, playerId);
  }

  async newLinkCode(s: Store, playerId: string) {
    const code = randomBytes(3).toString('hex').toUpperCase(); // e.g. 4F9A1C
    await this.prisma.player.update({ where: { id: playerId }, data: { linkCode: code, linkCodeExpiresAt: new Date(Date.now() + 15 * 60_000) } });
    return this.me(s, playerId);
  }

  async createOrder(s: Store, playerId: string, input: { packageId: string; quantity: number; mcUsername?: string }) {
    const pkg = await this.prisma.package.findFirst({ where: { id: input.packageId, storeId: s.id, isEnabled: true } });
    if (!pkg) throw new NotFoundException('Package not available');
    const c = await this.customer(s, playerId);
    const mcUsername = input.mcUsername ?? c.player.mcUsername;
    if (!mcUsername) throw new BadRequestException('Set your Minecraft username first');
    const isOwn = c.player.mcUsername?.toLowerCase() === mcUsername.toLowerCase();
    if (s.requireVerifiedUsername && (!isOwn || !c.player.mcVerified)) {
      throw new BadRequestException('This store requires a verified Minecraft account. Link your account in-game first.');
    }
    const quantity = pkg.durationType === 'PERMANENT' ? input.quantity : input.quantity;
    const price = calculatePrice([{ pricePaise: pkg.pricePaise, quantity }], s.discountPercent, Number(s.commissionPercent));
    const number = `${s.slug.replace(/-/g, '').slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}${randomBytes(1).toString('hex').toUpperCase()}`;
    return this.prisma.order.create({
      data: {
        number,
        storeId: s.id,
        customerId: c.id,
        mcUsername,
        mcUuid: isOwn && c.player.mcVerified ? c.player.mcUuid : null,
        commissionPercent: s.commissionPercent,
        ...price,
        items: { create: { packageId: pkg.id, nameSnap: pkg.name, pricePaise: pkg.pricePaise, quantity } },
      },
      include: { items: true },
    });
  }

  async myOrders(s: Store, playerId: string) {
    const c = await this.customer(s, playerId);
    return this.prisma.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' }, include: { items: true } });
  }

  async myOrder(s: Store, playerId: string, id: string) {
    const c = await this.customer(s, playerId);
    const order = await this.prisma.order.findFirst({
      where: { id, customerId: c.id },
      include: { items: true, deliveries: { select: { status: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const payment = await this.prisma.paymentConfig.findUnique({ where: { storeId: s.id } });
    const upiLink = payment?.upiId
      ? `upi://pay?${new URLSearchParams({ pa: payment.upiId, pn: payment.upiPayeeName ?? s.name, am: (order.totalPaise / 100).toFixed(2), tn: order.number, cu: 'INR' })}`
      : null;
    const delivered = order.deliveries.length > 0 && order.deliveries.every((d) => d.status === 'EXECUTED');
    return {
      order: { ...order, commissionPercent: Number(order.commissionPercent), deliveries: undefined, delivered },
      store: this.publicStore(s),
      payment: payment
        ? { upiId: payment.upiId, upiPayeeName: payment.upiPayeeName, qrImageUrl: payment.qrImageUrl, bankName: payment.bankName, accountName: payment.accountName, accountNumber: payment.accountNumber, ifsc: payment.ifsc, instructions: payment.instructions }
        : null,
      upiLink,
    };
  }

  async submitReference(s: Store, playerId: string, id: string, txnReference: string) {
    const c = await this.customer(s, playerId);
    const order = await this.prisma.order.findFirst({ where: { id, customerId: c.id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!['PENDING', 'AWAITING_VERIFICATION'].includes(order.status)) throw new BadRequestException('This order can no longer be updated');
    const used = await this.prisma.order.findFirst({ where: { storeId: s.id, txnReference, NOT: { id } } });
    if (used) throw new ConflictException('This transaction ID has already been used');
    await this.prisma.order.update({ where: { id }, data: { txnReference, referenceAt: new Date(), status: 'AWAITING_VERIFICATION' } });
    return this.myOrder(s, playerId, id);
  }

  async cancel(s: Store, playerId: string, id: string) {
    const c = await this.customer(s, playerId);
    const order = await this.prisma.order.findFirst({ where: { id, customerId: c.id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING') throw new BadRequestException('Only unpaid orders can be cancelled');
    await this.prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { ok: true };
  }
}
