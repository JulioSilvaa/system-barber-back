import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import AIController from '../controllers/AIController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import type { PrismaClient } from '@/generated/prisma/client';

export interface AIRoutesDeps {
  prisma: PrismaClient;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createAIRoutes(deps?: AIRoutesDeps) {
  const router = Router();

  const prisma = deps?.prisma;
  if (!prisma) {
    return router;
  }

  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();

  const controller = new AIController(prisma);

  router.get(
    '/barbershops/:barbershopId/ai/settings',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.getSettings),
  );

  router.put(
    '/barbershops/:barbershopId/ai/settings',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.updateSettings),
  );

  router.get(
    '/barbershops/:barbershopId/ai/inactive-clients',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.getInactiveClients),
  );

  return router;
}
