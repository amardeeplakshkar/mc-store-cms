import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { PlatformModule } from './platform/platform.module';
import { StoreAdminModule } from './store-admin/store-admin.module';
import { StorefrontModule } from './storefront/storefront.module';
import { PluginModule } from './plugin/plugin.module';
import { JobsService } from './jobs/jobs.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CommonModule,
    AuthModule,
    PlatformModule,
    StoreAdminModule,
    StorefrontModule,
    PluginModule,
  ],
  controllers: [HealthController],
  providers: [JobsService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
