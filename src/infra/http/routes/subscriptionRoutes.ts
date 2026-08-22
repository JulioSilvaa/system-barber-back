import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import SubscriptionController from '../controllers/SubscriptionController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import FeatureFlagRepositoryPrisma from '@/infra/repositories/prisma/featureFlagRepositoryPrisma';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import type { PrismaClient } from '@/generated/prisma/client';

export interface SubscriptionRoutesDeps {
  prisma: PrismaClient;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createSubscriptionRoutes(deps?: SubscriptionRoutesDeps) {
  const router = Router();

  const prisma = deps?.prisma;
  if (!prisma) {
    return router;
  }

  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const featureFlagRepository = new FeatureFlagRepositoryPrisma(prisma);

  const controller = new SubscriptionController(
    barbershopRepository,
    featureFlagRepository,
    prisma,
  );

  router.get(
    '/barbershops/:barbershopId/subscription',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.getByBarbershop),
  );

  router.post(
    '/barbershops/:barbershopId/subscription/subscribe',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.subscribe),
  );

  router.post(
    '/barbershops/:barbershopId/subscription/upgrade',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.upgrade),
  );

  router.post(
    '/barbershops/:barbershopId/subscription/cancel',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.cancel),
  );

  return router;
}
