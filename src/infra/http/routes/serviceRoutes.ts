import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import ServiceController from '../controllers/ServiceController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface ServiceRoutesDeps {
  serviceRepository: IServiceRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createServiceRoutes(deps?: ServiceRoutesDeps) {
  const router = Router();

  const serviceRepository = deps?.serviceRepository ?? new ServiceRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();

  const controller = new ServiceController(serviceRepository, barbershopRepository);

  router.post(
    '/barbershops/:barbershopId/services',
    requireAuth,
    requireMembership(userBarbershopRepository),
    ExpressAdapter.create(controller.create),
  );
  router.get(
    '/barbershops/:barbershopId/services',
    requireAuth,
    requireMembership(userBarbershopRepository),
    ExpressAdapter.create(controller.list),
  );

  return router;
}
