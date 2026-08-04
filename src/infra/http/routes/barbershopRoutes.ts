import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import BarbershopController from '../controllers/BarbershopController';
import { requireAuth } from '@/infra/middleware/AuthMiddleware';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface BarbershopRoutesDeps {
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createBarbershopRoutes(deps?: BarbershopRoutesDeps) {
  const router = Router();

  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();

  const controller = new BarbershopController(barbershopRepository, userBarbershopRepository);

  router.post('/barbershops', requireAuth, ExpressAdapter.create(controller.create));
  router.get('/barbershops', requireAuth, ExpressAdapter.create(controller.list));

  return router;
}
