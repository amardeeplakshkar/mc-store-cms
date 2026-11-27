import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { loginSchema } from '@mcstore/shared';
import { AuthService } from './auth.service';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/guards';
import { Auth } from '../common/decorators';
import type { AuthPayload } from '../common/types';

const adminLoginSchema = loginSchema.extend({ slug: z.string().optional() });

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('admin/login')
  login(@Body(new ZodPipe(adminLoginSchema)) body: z.infer<typeof adminLoginSchema>) {
    return this.auth.adminLogin(body.email, body.password, body.slug);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Auth() auth: AuthPayload) {
    if (auth.typ !== 'admin') return { typ: 'player', id: auth.sub };
    return this.auth.me(auth.sub);
  }

  @Get('discord/start')
  async start(@Query('slug') slug: string, @Res() res: Response) {
    res.redirect(await this.auth.discordAuthorizeUrl(slug));
  }

  @Get('discord/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    res.redirect(await this.auth.discordCallback(code, state));
  }

  @Post('player/exchange')
  exchange(@Body(new ZodPipe(z.object({ token: z.string(), slug: z.string() }))) body: { token: string; slug: string }) {
    return this.auth.exchange(body.token, body.slug);
  }
}
