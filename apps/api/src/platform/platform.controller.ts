import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  assignMemberSchema, createAdminSchema, createStoreSchema, globalConfigSchema, orderQuerySchema,
  settlementSchema, updateAdminSchema, updateStorePlatformSchema,
} from '@mcstore/shared';
import { z } from 'zod';
import { SuperAdminGuard } from '../common/guards';
import { ZodPipe } from '../common/zod.pipe';
import { Auth } from '../common/decorators';
import type { AdminAuth } from '../common/types';
import { OrdersService } from '../common/orders.service';
import { PlatformService } from './platform.service';

@UseGuards(SuperAdminGuard)
@Controller('platform')
export class PlatformController {
  constructor(private svc: PlatformService, private orders: OrdersService) {}

  // ----- stores
  @Get('stores')
  stores(@Query('q') q?: string) {
    return this.svc.listStores(q);
  }

  @Post('stores')
  createStore(@Auth() a: AdminAuth, @Body(new ZodPipe(createStoreSchema)) body: z.infer<typeof createStoreSchema>) {
    return this.svc.createStore(body, a.sub);
  }

  @Get('stores/:id')
  store(@Param('id') id: string) {
    return this.svc.getStore(id);
  }

  @Patch('stores/:id')
  updateStore(@Auth() a: AdminAuth, @Param('id') id: string, @Body(new ZodPipe(updateStorePlatformSchema)) body: z.infer<typeof updateStorePlatformSchema>) {
    return this.svc.updateStore(id, body, a.sub);
  }

  @Delete('stores/:id')
  deleteStore(@Auth() a: AdminAuth, @Param('id') id: string) {
    return this.svc.deleteStore(id, a.sub);
  }

  @Post('stores/:id/members')
  addMember(@Auth() a: AdminAuth, @Param('id') id: string, @Body(new ZodPipe(assignMemberSchema)) body: z.infer<typeof assignMemberSchema>) {
    return this.svc.addMember(id, body.adminId, body.role, a.sub);
  }

  @Delete('stores/:id/members/:adminId')
  removeMember(@Auth() a: AdminAuth, @Param('id') id: string, @Param('adminId') adminId: string) {
    return this.svc.removeMember(id, adminId, a.sub);
  }

  @Post('stores/:id/settlements')
  settle(@Auth() a: AdminAuth, @Param('id') id: string, @Body(new ZodPipe(settlementSchema)) body: z.infer<typeof settlementSchema>) {
    return this.svc.createSettlement(id, body, a.sub);
  }

  // ----- admins
  @Get('admins')
  admins() {
    return this.svc.listAdmins();
  }

  @Post('admins')
  createAdmin(@Auth() a: AdminAuth, @Body(new ZodPipe(createAdminSchema)) body: z.infer<typeof createAdminSchema>) {
    return this.svc.createAdmin(body, a.sub);
  }

  @Patch('admins/:id')
  updateAdmin(@Auth() a: AdminAuth, @Param('id') id: string, @Body(new ZodPipe(updateAdminSchema)) body: z.infer<typeof updateAdminSchema>) {
    return this.svc.updateAdmin(id, body, a.sub);
  }

  @Delete('admins/:id')
  deleteAdmin(@Auth() a: AdminAuth, @Param('id') id: string) {
    return this.svc.deleteAdmin(id, a.sub);
  }

  // ----- orders, stats, logs, config
  @Get('orders')
  ordersList(@Query(new ZodPipe(orderQuerySchema)) q: z.infer<typeof orderQuerySchema>) {
    return this.orders.list(q);
  }

  @Get('orders/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  ordersCsv(@Query(new ZodPipe(orderQuerySchema)) q: z.infer<typeof orderQuerySchema>) {
    return this.orders.exportCsv(q);
  }

  @Get('orders/:id')
  order(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @Get('stats')
  stats() {
    return this.svc.stats();
  }

  @Get('audit-logs')
  logs(@Query('storeId') storeId?: string, @Query('page') page = '1') {
    return this.svc.auditLogs(storeId, Number(page) || 1);
  }

  @Get('config')
  config() {
    return this.svc.getConfig();
  }

  @Put('config')
  setConfig(@Auth() a: AdminAuth, @Body(new ZodPipe(globalConfigSchema)) body: z.infer<typeof globalConfigSchema>) {
    return this.svc.setConfig(body.key, body.value, a.sub);
  }
}
