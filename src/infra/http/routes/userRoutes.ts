import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import UserController from '../controllers/UserController';
import {
  requireAdmin,
  requireAuth,
  requireBarbershopSelf,
} from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface UserRoutesDeps {
  userRepository: IUserRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  auditService: AuditService;
}

export default function createUserRoutes(deps?: UserRoutesDeps) {
  const router = Router();

  const userRepository = deps?.userRepository ?? new UserRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new UserController(userRepository, userBarbershopRepository, auditService);

  router.post('/users', requireAuth, requireBarbershopSelf, ExpressAdapter.create(controller.add));
  router.get('/users', requireAuth, requireAdmin, ExpressAdapter.create(controller.list));
  router.delete('/users/:id', requireAuth, requireAdmin, ExpressAdapter.create(controller.delete));

  return router;
}
