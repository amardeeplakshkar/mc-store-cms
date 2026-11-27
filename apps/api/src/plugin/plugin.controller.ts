import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Store } from '@mcstore/db';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { CurrentStore } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { PluginGuard } from './plugin.guard';

const queueSchema = z.object({ online: z.array(z.object({ uuid: z.string(), name: z.string() })).max(5000).default([]) });
const ackSchema = z.object({ results: z.array(z.object({ id: z.string(), success: z.boolean(), error: z.string().max(500).optional() })).max(200) });
const linkSchema = z.object({ code: z.string().trim().toUpperCase(), uuid: z.string(), username: z.string() });

const MAX_ATTEMPTS = 5;

@SkipThrottle()
@UseGuards(PluginGuard)
@Controller('plugin')
export class PluginController {
  constructor(private prisma: PrismaService) {}

  /** Returns commands ready to run. Commands flagged requireOnline only go out when the player is online. */
  @Post('queue')
  async queue(@CurrentStore() s: Store, @Body(new ZodPipe(queueSchema)) b: z.infer<typeof queueSchema>) {
    await this.prisma.store.update({ where: { id: s.id }, data: { pluginLastSeenAt: new Date() } });
    if (!s.isEnabled) return { deliveries: [] };
    const names = b.online.map((p) => p.name);
    const uuids = b.online.map((p) => p.uuid);
    const rows = await this.prisma.delivery.findMany({
      where: {
        storeId: s.id,
        status: 'QUEUED',
        runAfter: { lte: new Date() },
        OR: [
          { requireOnline: false },
          { requireOnline: true, mcUsername: { in: names, mode: 'insensitive' } },
          { requireOnline: true, mcUuid: { in: uuids } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return { deliveries: rows.map((d) => ({ id: d.id, command: d.command, username: d.mcUsername, uuid: d.mcUuid })) };
  }

  @Post('ack')
  async ack(@CurrentStore() s: Store, @Body(new ZodPipe(ackSchema)) b: z.infer<typeof ackSchema>) {
    for (const r of b.results) {
      const d = await this.prisma.delivery.findFirst({ where: { id: r.id, storeId: s.id } });
      if (!d) continue;
      if (r.success) {
        await this.prisma.delivery.update({ where: { id: d.id }, data: { status: 'EXECUTED', executedAt: new Date(), attempts: d.attempts + 1 } });
      } else {
        const attempts = d.attempts + 1;
        await this.prisma.delivery.update({
          where: { id: d.id },
          data: { attempts, lastError: r.error ?? 'Unknown error', status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'QUEUED', runAfter: new Date(Date.now() + attempts * 60_000) },
        });
      }
    }
    return { ok: true };
  }

  /** Called by the in-game `/link <code>` command to verify a player's Minecraft account. */
  @Post('link')
  async link(@Body(new ZodPipe(linkSchema)) b: z.infer<typeof linkSchema>) {
    const player = await this.prisma.player.findUnique({ where: { linkCode: b.code } });
    if (!player || !player.linkCodeExpiresAt || player.linkCodeExpiresAt < new Date()) return { ok: false, message: 'Invalid or expired code. Generate a new one on the store.' };
    if (player.mcUsername && player.mcUsername.toLowerCase() !== b.username.toLowerCase()) {
      return { ok: false, message: `This code belongs to ${player.mcUsername}. Log in with that account or change your username on the store.` };
    }
    await this.prisma.player.update({
      where: { id: player.id },
      data: { mcUsername: b.username, mcUuid: b.uuid, mcVerified: true, linkCode: null, linkCodeExpiresAt: null },
    });
    // attach uuid to unpaid / pending orders for this player
    await this.prisma.order.updateMany({
      where: { customer: { playerId: player.id }, mcUuid: null, mcUsername: { equals: b.username, mode: 'insensitive' } },
      data: { mcUuid: b.uuid },
    });
    return { ok: true, message: 'Your account is now linked to the store.' };
  }
}
