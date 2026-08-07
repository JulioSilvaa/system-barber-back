import { Request } from 'express';
import { AuditContext } from '@/application/services/AuditService';

export function buildAuditContext(req: Request): AuditContext {
  return {
    actorId: req.userId,
    actorType: req.actor,
    actorRole: req.actor === 'ADMIN' ? 'ADMIN' : req.localRole,
    barbershopId: req.barbershopId,
  };
}
