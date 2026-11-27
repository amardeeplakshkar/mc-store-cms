import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Store } from '@mcstore/db';
import { categorySchema, discountSchema, orderQuerySchema, packageSchema, paymentConfigSchema, storeSettingsSchema, updateOrderStatusSchema } from '@mcstore/shared';
import { z } from 'zod';
import { StoreAdminGuard } from '../common/guards';
import { ZodPipe } from '../common/zod.pipe';
import { Auth, CurrentStore } from '../common/decorators';
import type { AdminAuth } from '../common/types';
import { OrdersService } from '../common/orders.service';
import { UploadsService } from '../common/uploads.service';
import { StoreAdminService } from './store-admin.service';

/** All routes are scoped to /v1/stores/:slug and require store membership (or super admin). */
@UseGuards(StoreAdminGuard)
@Controller('stores/:slug')
export class StoreAdminController {
  constructor(private svc: StoreAdminService, private orders: OrdersService, private uploads: UploadsService) {}

  // ----- settings
  @Get()
  get(@CurrentStore() s: Store) {
    return this.svc.getStore(s);
  }

  @Patch('settings')
  settings(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Body(new ZodPipe(storeSettingsSchema)) b: z.infer<typeof storeSettingsSchema>) {
    return this.svc.updateSettings(s, b, a.sub);
  }

  @Put('discount')
  discount(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Body(new ZodPipe(discountSchema)) b: z.infer<typeof discountSchema>) {
    return this.svc.setDiscount(s, b.discountPercent, a.sub);
  }

  @Post('plugin-key')
  pluginKey(@Auth() a: AdminAuth, @CurrentStore() s: Store) {
    return this.svc.rotatePluginKey(s, a.sub);
  }

  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 3 * 1024 * 1024 } }))
  upload(@CurrentStore() s: Store, @UploadedFile() file: Express.Multer.File, @Query('kind') kind = 'image') {
    return this.uploads.uploadImage(s.id, file, kind);
  }

  @Get('stats')
  stats(@CurrentStore() s: Store) {
    return this.svc.stats(s);
  }

  // ----- categories
  @Get('categories')
  categories(@CurrentStore() s: Store) {
    return this.svc.listCategories(s);
  }

  @Post('categories')
  createCategory(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Body(new ZodPipe(categorySchema)) b: z.infer<typeof categorySchema>) {
    return this.svc.createCategory(s, b, a.sub);
  }

  @Patch('categories/:id')
  updateCategory(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string, @Body(new ZodPipe(categorySchema)) b: z.infer<typeof categorySchema>) {
    return this.svc.updateCategory(s, id, b, a.sub);
  }

  @Delete('categories/:id')
  deleteCategory(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string) {
    return this.svc.deleteCategory(s, id, a.sub);
  }

  // ----- packages
  @Get('packages')
  packages(@CurrentStore() s: Store) {
    return this.svc.listPackages(s);
  }

  @Get('packages/:id')
  pkg(@CurrentStore() s: Store, @Param('id') id: string) {
    return this.svc.getPackage(s, id);
  }

  @Post('packages')
  createPackage(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Body(new ZodPipe(packageSchema)) b: z.infer<typeof packageSchema>) {
    return this.svc.createPackage(s, b, a.sub);
  }

  @Put('packages/:id')
  updatePackage(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string, @Body(new ZodPipe(packageSchema)) b: z.infer<typeof packageSchema>) {
    return this.svc.updatePackage(s, id, b, a.sub);
  }

  @Patch('packages/:id/enabled')
  togglePackage(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string, @Body(new ZodPipe(z.object({ isEnabled: z.boolean() }))) b: { isEnabled: boolean }) {
    return this.svc.togglePackage(s, id, b.isEnabled, a.sub);
  }

  @Delete('packages/:id')
  deletePackage(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string) {
    return this.svc.deletePackage(s, id, a.sub);
  }

  // ----- payment config
  @Get('payment-config')
  payment(@CurrentStore() s: Store) {
    return this.svc.getPayment(s);
  }

  @Put('payment-config')
  setPayment(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Body(new ZodPipe(paymentConfigSchema)) b: z.infer<typeof paymentConfigSchema>) {
    return this.svc.setPayment(s, b, a.sub);
  }

  // ----- orders (transactions)
  @Get('orders')
  ordersList(@CurrentStore() s: Store, @Query(new ZodPipe(orderQuerySchema)) q: z.infer<typeof orderQuerySchema>) {
    return this.orders.list(q, s.id);
  }

  @Get('orders/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  csv(@CurrentStore() s: Store, @Query(new ZodPipe(orderQuerySchema)) q: z.infer<typeof orderQuerySchema>) {
    return this.orders.exportCsv(q, s.id);
  }

  @Get('orders/:id')
  order(@CurrentStore() s: Store, @Param('id') id: string) {
    return this.orders.get(id, s.id);
  }

  @Post('orders/:id/verify')
  verify(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string, @Body() b: { note?: string }) {
    return this.orders.verify(id, s.id, a.sub, b?.note);
  }

  @Patch('orders/:id/status')
  status(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string, @Body(new ZodPipe(updateOrderStatusSchema)) b: z.infer<typeof updateOrderStatusSchema>) {
    return this.orders.updateStatus(id, s.id, a.sub, b.status, b.note);
  }

  @Post('orders/:id/redeliver')
  redeliver(@Auth() a: AdminAuth, @CurrentStore() s: Store, @Param('id') id: string) {
    return this.svc.redeliver(s, id, a.sub);
  }

  // ----- users
  @Get('customers')
  customers(@CurrentStore() s: Store, @Query('q') q?: string, @Query('page') page = '1') {
    return this.svc.listCustomers(s, q, Number(page) || 1);
  }

  @Get('customers/:id')
  customer(@CurrentStore() s: Store, @Param('id') id: string) {
    return this.svc.getCustomer(s, id);
  }
}
