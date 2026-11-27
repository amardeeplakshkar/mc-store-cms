import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import { OrdersService } from './orders.service';
import { UploadsService } from './uploads.service';
import { AuthGuard, PlayerGuard, StoreAdminGuard, StorefrontGuard, SuperAdminGuard } from './guards';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({ secret: process.env.JWT_SECRET ?? 'dev-secret', signOptions: { expiresIn: '7d' } }),
    }),
  ],
  providers: [PrismaService, AuditService, OrdersService, UploadsService, AuthGuard, SuperAdminGuard, StoreAdminGuard, StorefrontGuard, PlayerGuard],
  exports: [JwtModule, PrismaService, AuditService, OrdersService, UploadsService, AuthGuard, SuperAdminGuard, StoreAdminGuard, StorefrontGuard, PlayerGuard],
})
export class CommonModule {}
