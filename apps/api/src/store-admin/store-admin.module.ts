import { Module } from '@nestjs/common';
import { StoreAdminController } from './store-admin.controller';
import { StoreAdminService } from './store-admin.service';

@Module({ controllers: [StoreAdminController], providers: [StoreAdminService] })
export class StoreAdminModule {}
