import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: { actorId?: string | null; storeId?: string | null; action: string; entity: string; entityId?: string | null; data?: unknown }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId ?? null,
          storeId: params.storeId ?? null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId ?? null,
          data: (params.data as any) ?? undefined,
        },
      });
    } catch (e) {
      console.error('audit log failed', e);
    }
  }
}
