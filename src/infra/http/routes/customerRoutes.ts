import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import CustomerController from '../controllers/CustomerController';
import { requireAuth, requireMembership, requireOwner } from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface CustomerRoutesDeps {
  customerRepository: ICustomerRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  auditService: AuditService;
}

export default function createCustomerRoutes(deps?: CustomerRoutesDeps) {
  const router = Router();

  const customerRepository = deps?.customerRepository ?? new CustomerRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new CustomerController(customerRepository, barbershopRepository, auditService);

  router.post(
    '/barbershops/:barbershopId/customers',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.create),
  );
  router.get(
    '/barbershops/:barbershopId/customers',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.list),
  );
  router.patch(
    '/barbershops/:barbershopId/customers/:id/vip',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    requireOwner,
    ExpressAdapter.create(controller.setVip),
  );

  return router;
}
