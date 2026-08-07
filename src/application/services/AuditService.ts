import { randomUUID } from 'node:crypto';
import { ActorType, AuditLog } from '@/domain/entities/AuditLog';
import IAuditRepository from '@/domain/repository/AuditRepository';

export type AuditContext = {
  actorId?: string;
  actorType?: ActorType;
  actorRole?: string;
  barbershopId?: string;
};

export type RecordAuditInput = AuditContext & {
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export default class AuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async record(input: RecordAuditInput): Promise<AuditLog> {
    const entry = new AuditLog({
      id: randomUUID(),
      actorId: input.actorId,
      actorType: input.actorType ?? 'SYSTEM',
      actorRole: input.actorRole,
      barbershopId: input.barbershopId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
    });

    return this.auditRepository.record(entry);
  }
}
