import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import type { AppRequest } from '../common/types';

/** Authenticates the in-game plugin with header `X-Plugin-Key: <storeId>.<secret>`. */
@Injectable()
export class PluginGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const key = String(req.headers['x-plugin-key'] ?? '');
    const storeId = key.split('.')[0];
    if (!storeId) throw new UnauthorizedException('Missing plugin key');
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store?.pluginKeyHash) throw new UnauthorizedException('Invalid plugin key');
    const a = Buffer.from(createHash('sha256').update(key).digest('hex'));
    const b = Buffer.from(store.pluginKeyHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Invalid plugin key');
    req.store = store;
    return true;
  }
}
