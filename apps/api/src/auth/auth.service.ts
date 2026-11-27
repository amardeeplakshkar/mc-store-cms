import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { validateSlug } from '@mcstore/shared';
import { PrismaService } from '../common/prisma.service';

const DISCORD_API = 'https://discord.com/api';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async adminLogin(email: string, password: string, slug?: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email: email.toLowerCase() }, include: { memberships: { include: { store: true } } } });
    if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    // Scope check: super admin host requires super admin, store admin host requires membership
    if (slug === undefined && !admin.isSuperAdmin) throw new UnauthorizedException('Super admin access only');
    if (slug && !admin.isSuperAdmin && !admin.memberships.some((m) => m.store.slug === slug)) {
      throw new UnauthorizedException('You are not an admin of this store');
    }
    const token = await this.jwt.signAsync({ typ: 'admin', sub: admin.id, sa: admin.isSuperAdmin });
    return { token, admin: this.publicAdmin(admin) };
  }

  async me(adminId: string) {
    const admin = await this.prisma.admin.findUniqueOrThrow({ where: { id: adminId }, include: { memberships: { include: { store: true } } } });
    return this.publicAdmin(admin);
  }

  private publicAdmin(a: any) {
    return {
      id: a.id,
      email: a.email,
      name: a.name,
      isSuperAdmin: a.isSuperAdmin,
      stores: (a.memberships ?? []).map((m: any) => ({ slug: m.store.slug, name: m.store.name, role: m.role })),
    };
  }

  // ---------- Discord SSO for players ----------
  async discordAuthorizeUrl(slug: string) {
    if (validateSlug(slug)) throw new BadRequestException('Invalid store');
    const store = await this.prisma.store.findUnique({ where: { slug } });
    if (!store?.isEnabled) throw new BadRequestException('Store unavailable');
    const state = await this.jwt.signAsync({ typ: 'state', slug }, { expiresIn: '10m' });
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID ?? '',
      redirect_uri: this.discordRedirect(),
      response_type: 'code',
      scope: 'identify email',
      state,
      prompt: 'none',
    });
    return `https://discord.com/oauth2/authorize?${params}`;
  }

  async discordCallback(code: string, state: string) {
    let slug: string;
    try {
      const s = await this.jwt.verifyAsync<{ typ: string; slug: string }>(state);
      if (s.typ !== 'state') throw new Error();
      slug = s.slug;
    } catch {
      throw new BadRequestException('Login expired, please try again');
    }
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID ?? '',
        client_secret: process.env.DISCORD_CLIENT_SECRET ?? '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.discordRedirect(),
      }),
    });
    if (!tokenRes.ok) throw new BadRequestException('Discord login failed');
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!userRes.ok) throw new BadRequestException('Discord login failed');
    const u = (await userRes.json()) as { id: string; username: string; global_name?: string; email?: string; avatar?: string };

    const player = await this.prisma.player.upsert({
      where: { provider_providerId: { provider: 'discord', providerId: u.id } },
      update: { email: u.email, displayName: u.global_name ?? u.username, avatarUrl: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null },
      create: {
        provider: 'discord',
        providerId: u.id,
        email: u.email,
        displayName: u.global_name ?? u.username,
        avatarUrl: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null,
      },
    });
    const handoff = await this.jwt.signAsync({ typ: 'handoff', sub: player.id, slug }, { expiresIn: '2m' });
    const proto = process.env.WEB_PROTOCOL ?? 'https';
    return `${proto}://${slug}.${process.env.ROOT_DOMAIN}/auth/callback?t=${encodeURIComponent(handoff)}`;
  }

  /** Exchange the short-lived handoff token (from the redirect) for a session token. */
  async exchange(handoff: string, slug: string) {
    try {
      const p = await this.jwt.verifyAsync<{ typ: string; sub: string; slug: string }>(handoff);
      if (p.typ !== 'handoff' || p.slug !== slug) throw new Error();
      const token = await this.jwt.signAsync({ typ: 'player', sub: p.sub }, { expiresIn: '30d' });
      return { token };
    } catch {
      throw new UnauthorizedException('Login link expired');
    }
  }

  private discordRedirect() {
    return `${process.env.PUBLIC_API_URL ?? process.env.API_URL}/v1/auth/discord/callback`;
  }
}
