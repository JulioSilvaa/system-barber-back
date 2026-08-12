import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import WorkingHoursController from '../controllers/WorkingHoursController';
import {
  requireAuth,
  requireBarbershopSelf,
  resolveBarbershop,
} from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

export interface WorkingHoursRoutesDeps {
  workingHoursRepository: IWorkingHoursRepository;
  barbershopRepository: IBarbershopRepository;
  auditService: AuditService;
}

export default function createWorkingHoursRoutes(deps?: WorkingHoursRoutesDeps) {
  const router = Router();

  const workingHoursRepository = deps?.workingHoursRepository ?? new WorkingHoursRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new WorkingHoursController(
    workingHoursRepository,
    barbershopRepository,
    auditService,
  );

  router.get(
    '/barbershops/:identifier/working-hours',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.get),
  );
  router.put(
    '/barbershops/:barbershopId/working-hours',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.update),
  );

  return router;
}
