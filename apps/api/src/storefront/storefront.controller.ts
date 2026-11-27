import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Store } from '@mcstore/db';
import { createOrderSchema, setUsernameSchema, submitReferenceSchema } from '@mcstore/shared';
import { z } from 'zod';
import { PlayerGuard, StorefrontGuard } from '../common/guards';
import { ZodPipe } from '../common/zod.pipe';
import { Auth, CurrentStore } from '../common/decorators';
import type { PlayerAuth } from '../common/types';
import { StorefrontService } from './storefront.service';

@Controller('s/:slug')
export class StorefrontController {
  constructor(private svc: StorefrontService) {}

  @UseGuards(StorefrontGuard)
  @Get()
  store(@CurrentStore() s: Store) {
    return this.svc.catalog(s);
  }

  @UseGuards(StorefrontGuard)
  @Get('packages/:id')
  pkg(@CurrentStore() s: Store, @Param('id') id: string) {
    return this.svc.package(s, id);
  }

  @UseGuards(PlayerGuard)
  @Get('me')
  me(@CurrentStore() s: Store, @Auth() a: PlayerAuth) {
    return this.svc.me(s, a.sub);
  }

  @UseGuards(PlayerGuard)
  @Post('me/username')
  username(@CurrentStore() s: Store, @Auth() a: PlayerAuth, @Body(new ZodPipe(setUsernameSchema)) b: z.infer<typeof setUsernameSchema>) {
    return this.svc.setUsername(s, a.sub, b.mcUsername);
  }

  @UseGuards(PlayerGuard)
  @Post('me/link-code')
  linkCode(@CurrentStore() s: Store, @Auth() a: PlayerAuth) {
    return this.svc.newLinkCode(s, a.sub);
  }

  @UseGuards(PlayerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('orders')
  create(@CurrentStore() s: Store, @Auth() a: PlayerAuth, @Body(new ZodPipe(createOrderSchema)) b: z.infer<typeof createOrderSchema>) {
    return this.svc.createOrder(s, a.sub, b);
  }

  @UseGuards(PlayerGuard)
  @Get('orders')
  orders(@CurrentStore() s: Store, @Auth() a: PlayerAuth) {
    return this.svc.myOrders(s, a.sub);
  }

  @UseGuards(PlayerGuard)
  @Get('orders/:id')
  order(@CurrentStore() s: Store, @Auth() a: PlayerAuth, @Param('id') id: string) {
    return this.svc.myOrder(s, a.sub, id);
  }

  @UseGuards(PlayerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('orders/:id/reference')
  reference(@CurrentStore() s: Store, @Auth() a: PlayerAuth, @Param('id') id: string, @Body(new ZodPipe(submitReferenceSchema)) b: z.infer<typeof submitReferenceSchema>) {
    return this.svc.submitReference(s, a.sub, id, b.txnReference);
  }

  @UseGuards(PlayerGuard)
  @Post('orders/:id/cancel')
  cancel(@CurrentStore() s: Store, @Auth() a: PlayerAuth, @Param('id') id: string) {
    return this.svc.cancel(s, a.sub, id);
  }
}
