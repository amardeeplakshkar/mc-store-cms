import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import type { AppRequest, AuthPayload } from './types';

function bearer(req: AppRequest): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(protected jwt: JwtService, protected prisma: PrismaService) {}

  protected async decode(req: AppRequest, required = true): Promise<AuthPayload | undefined> {
    const token = bearer(req);
    if (!token) {
      if (required) throw new UnauthorizedException('Not signed in');
      return undefined;
    }
    try {
      const p = await this.jwt.verifyAsync<AuthPayload>(token);
      if (p.typ !== 'admin' && p.typ !== 'player') throw new Error('bad token');
      req.auth = p;
      return p;
    } catch {
      if (required) throw new UnauthorizedException('Session expired');
      return undefined;
    }
  }

  async canActivate(ctx: ExecutionContext) {
    await this.decode(ctx.switchToHttp().getRequest());
    return true;
  }
}

@Injectable()
export class SuperAdminGuard extends AuthGuard {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const p = await this.decode(req);
    if (p?.typ !== 'admin') throw new ForbiddenException();
    const admin = await this.prisma.admin.findUnique({ where: { id: p.sub } });
    if (!admin?.isActive || !admin.isSuperAdmin) throw new ForbiddenException('Super admin only');
    return true;
  }
}

/** Requires an admin who is a member of the store in :slug (or a super admin). */
@Injectable()
export class StoreAdminGuard extends AuthGuard {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const p = await this.decode(req);
    if (p?.typ !== 'admin') throw new ForbiddenException();
    const slug = req.params.slug;
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store) throw new NotFoundException('Store not found');
    const admin = await this.prisma.admin.findUnique({ where: { id: p.sub } });
    if (!admin?.isActive) throw new ForbiddenException();
    if (!admin.isSuperAdmin) {
      const m = await this.prisma.storeMember.findUnique({ where: { storeId_adminId: { storeId: store.id, adminId: admin.id } } });
      if (!m) throw new ForbiddenException('No access to this store');
      if (!store.isEnabled && req.method !== 'GET') throw new ForbiddenException('This store is disabled by the platform');
    }
    req.store = store;
    return true;
  }
}

/** Public storefront: store must exist and be enabled. Player token optional. */
@Injectable()
export class StorefrontGuard extends AuthGuard {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const store = await this.prisma.store.findUnique({ where: { slug: req.params.slug } });
    if (!store) throw new NotFoundException('Store not found');
    if (!store.isEnabled) throw new ForbiddenException('Store unavailable');
    req.store = store;
    await this.decode(req, false);
    return true;
  }
}

/** Storefront + signed-in player. */
@Injectable()
export class PlayerGuard extends StorefrontGuard {
  async canActivate(ctx: ExecutionContext) {
    await super.canActivate(ctx);
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    if (req.auth?.typ !== 'player') throw new UnauthorizedException('Sign in to continue');
    return true;
  }
}
