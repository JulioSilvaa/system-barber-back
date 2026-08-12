import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import AppointmentController from '../controllers/AppointmentController';
import {
  requireAuth,
  requireMembership,
  resolveBarbershop,
} from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import CashRegisterRepositoryMemory from '@/infra/repositories/inMemory/cashRegister/cashRegisterRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';

export interface AppointmentRoutesDeps {
  appointmentRepository: IAppointmentRepository;
  serviceRepository: IServiceRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  customerRepository: ICustomerRepository;
  cashRegisterRepository?: ICashRegisterRepository;
  commissionRepository?: ICommissionRepository;
  auditService: AuditService;
}

export default function createAppointmentRoutes(deps?: AppointmentRoutesDeps) {
  const router = Router();

  const appointmentRepository = deps?.appointmentRepository ?? new AppointmentRepositoryMemory();
  const serviceRepository = deps?.serviceRepository ?? new ServiceRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const customerRepository = deps?.customerRepository ?? new CustomerRepositoryMemory();
  const cashRegisterRepository = deps?.cashRegisterRepository ?? new CashRegisterRepositoryMemory();
  const commissionRepository = deps?.commissionRepository ?? new CommissionRepositoryMemory();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new AppointmentController(
    appointmentRepository,
    serviceRepository,
    barbershopRepository,
    userBarbershopRepository,
    customerRepository,
    auditService,
    cashRegisterRepository,
    commissionRepository,
  );

  router.post(
    '/barbershops/:identifier/appointments',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.create),
  );
  router.get(
    '/barbershops/:identifier/appointments/busy',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.listBusy),
  );
  router.get(
    '/barbershops/:barbershopId/appointments',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.listDay),
  );
  router.patch(
    '/barbershops/:barbershopId/appointments/:id/complete',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.complete),
  );
  router.patch(
    '/barbershops/:barbershopId/appointments/:id/cancel',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.cancel),
  );

  return router;
}
