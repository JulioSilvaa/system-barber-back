import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import MembershipController from '../controllers/MembershipController';
import { requireAuth, requireBarbershopSelf } from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface MembershipRoutesDeps {
  userBarbershopRepository: IUserBarbershopRepository;
  userRepository: IUserRepository;
  barbershopRepository: IBarbershopRepository;
  auditService: AuditService;
}

export default function createMembershipRoutes(deps?: MembershipRoutesDeps) {
  const router = Router();

  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const userRepository = deps?.userRepository ?? new UserRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new MembershipController(
    userBarbershopRepository,
    userRepository,
    barbershopRepository,
    auditService,
  );

  router.get('/memberships', requireAuth, ExpressAdapter.create(controller.list));
  router.post(
    '/memberships',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.addBarber),
  );
  router.post('/memberships/switch', requireAuth, ExpressAdapter.create(controller.switch));
  router.get(
    '/barbershops/:barbershopId/memberships',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.listByBarbershop),
  );
  router.patch(
    '/barbershops/:barbershopId/memberships/:membershipId/status',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.updateBarberStatus),
  );
  router.delete(
    '/barbershops/:barbershopId/memberships/:membershipId',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.removeBarber),
  );

  return router;
}
