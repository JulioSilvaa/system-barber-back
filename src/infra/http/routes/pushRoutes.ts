import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import PushController from '../controllers/PushController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import type { PrismaClient } from '@/generated/prisma/client';

export interface PushRoutesDeps {
  prisma: PrismaClient;
  userBarbershopRepository: IUserBarbershopRepository;
  barbershopRepository: IBarbershopRepository;
}

export default function createPushRoutes(deps?: PushRoutesDeps) {
  const router = Router();

  const prisma = deps?.prisma;
  if (!prisma) {
    return router;
  }

  const controller = new PushController(prisma);
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();

  router.get('/push/vapid-public-key', ExpressAdapter.create(controller.getVapidPublicKey));

  router.post(
    '/barbershops/:barbershopId/push/subscribe',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.subscribe),
  );

  router.post(
    '/barbershops/:barbershopId/push/unsubscribe',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.unsubscribe),
  );

  return router;
}
