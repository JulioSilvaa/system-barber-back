import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import CashRegisterController from '../controllers/CashRegisterController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import CashRegisterRepositoryMemory from '@/infra/repositories/inMemory/cashRegister/cashRegisterRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

export interface CashRegisterRoutesDeps {
  cashRegisterRepository: ICashRegisterRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  barbershopRepository: IBarbershopRepository;
  auditService: AuditService;
}

export default function createCashRegisterRoutes(deps?: CashRegisterRoutesDeps) {
  const router = Router();

  const cashRegisterRepository = deps?.cashRegisterRepository ?? new CashRegisterRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new CashRegisterController(cashRegisterRepository, auditService);

  router.get(
    '/barbershops/:barbershopId/cash-register',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.overview),
  );
  router.post(
    '/barbershops/:barbershopId/cash-register/open',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.open),
  );
  router.post(
    '/barbershops/:barbershopId/cash-register/close',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.close),
  );
  router.post(
    '/barbershops/:barbershopId/cash-register/movements',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.addMovement),
  );

  return router;
}
