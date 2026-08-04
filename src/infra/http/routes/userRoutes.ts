import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import UserController from '../controllers/UserController';
import {
  requireAuth,
  requireSuperAdmin,
  requireSuperAdminOrOwner,
} from '@/infra/middleware/AuthMiddleware';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface UserRoutesDeps {
  userRepository: IUserRepository;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createUserRoutes(deps?: UserRoutesDeps) {
  const router = Router();

  const userRepository = deps?.userRepository ?? new UserRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();

  const controller = new UserController(userRepository, userBarbershopRepository);

  router.post(
    '/users',
    requireAuth,
    requireSuperAdminOrOwner(userBarbershopRepository),
    ExpressAdapter.create(controller.add),
  );
  router.get('/users', requireAuth, ExpressAdapter.create(controller.list));
  router.delete(
    '/users/:id',
    requireAuth,
    requireSuperAdmin,
    ExpressAdapter.create(controller.delete),
  );
  router.patch(
    '/users/:id/role',
    requireAuth,
    requireSuperAdmin,
    ExpressAdapter.create(controller.updateRole),
  );

  return router;
}
