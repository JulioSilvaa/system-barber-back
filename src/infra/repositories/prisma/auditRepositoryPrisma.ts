import { AuditLog } from '@/domain/entities/AuditLog';
import IAuditRepository from '@/domain/repository/AuditRepository';
import type { PrismaClient, Prisma } from '@/generated/prisma/client';

export default class AuditRepositoryPrisma implements IAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(entry: AuditLog): Promise<AuditLog> {
    await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        actorId: entry.actorId ?? null,
        actorType: entry.actorType,
        actorRole: entry.actorRole ?? null,
        barbershopId: entry.barbershopId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: (entry.before as Prisma.InputJsonValue) ?? undefined,
        after: (entry.after as Prisma.InputJsonValue) ?? undefined,
        createdAt: entry.createdAt,
      },
    });

    return entry;
  }
}
