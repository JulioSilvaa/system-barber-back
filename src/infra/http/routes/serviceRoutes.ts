import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import ServiceController from '../controllers/ServiceController';
import {
  requireAuth,
  requireMembership,
  resolveBarbershop,
} from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface ServiceRoutesDeps {
  serviceRepository: IServiceRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  auditService: AuditService;
}

export default function createServiceRoutes(deps?: ServiceRoutesDeps) {
  const router = Router();

  const serviceRepository = deps?.serviceRepository ?? new ServiceRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new ServiceController(serviceRepository, barbershopRepository, auditService);

  router.post(
    '/barbershops/:barbershopId/services',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.create),
  );
  router.get(
    '/barbershops/:identifier/services',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.list),
  );
  router.patch(
    '/barbershops/:barbershopId/services/:serviceId',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.update),
  );
  router.patch(
    '/barbershops/:barbershopId/services/:serviceId/status',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.setActive),
  );

  return router;
}
