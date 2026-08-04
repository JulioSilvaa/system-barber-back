import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import MembershipController from '../controllers/MembershipController';
import { requireAuth, requireSuperAdminOrOwner } from '@/infra/middleware/AuthMiddleware';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface MembershipRoutesDeps {
  userBarbershopRepository: IUserBarbershopRepository;
  userRepository: IUserRepository;
  barbershopRepository: IBarbershopRepository;
}

export default function createMembershipRoutes(deps?: MembershipRoutesDeps) {
  const router = Router();

  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const userRepository = deps?.userRepository ?? new UserRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();

  const controller = new MembershipController(
    userBarbershopRepository,
    userRepository,
    barbershopRepository,
  );

  router.get('/memberships', requireAuth, ExpressAdapter.create(controller.list));
  router.post(
    '/memberships',
    requireAuth,
    requireSuperAdminOrOwner(userBarbershopRepository),
    ExpressAdapter.create(controller.addBarber),
  );
  router.post('/memberships/switch', requireAuth, ExpressAdapter.create(controller.switch));

  return router;
}
