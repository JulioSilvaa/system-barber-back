import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import ReportController from '../controllers/ReportController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import FinanceEntryRepositoryMemory from '@/infra/repositories/inMemory/financeEntry/financeEntryRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface ReportRoutesDeps {
  appointmentRepository: IAppointmentRepository;
  financeEntryRepository: IFinanceEntryRepository;
  commissionRepository: ICommissionRepository;
  userRepository: IUserRepository;
  customerRepository: ICustomerRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createReportRoutes(deps?: ReportRoutesDeps) {
  const router = Router();

  const appointmentRepository = deps?.appointmentRepository ?? new AppointmentRepositoryMemory();
  const financeEntryRepository = deps?.financeEntryRepository ?? new FinanceEntryRepositoryMemory();
  const commissionRepository = deps?.commissionRepository ?? new CommissionRepositoryMemory();
  const userRepository = deps?.userRepository ?? new UserRepositoryMemory();
  const customerRepository = deps?.customerRepository ?? new CustomerRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();

  const controller = new ReportController(
    appointmentRepository,
    financeEntryRepository,
    commissionRepository,
    userRepository,
    customerRepository,
  );

  const authMiddleware = requireAuth;
  const membershipMiddleware = requireMembership(userBarbershopRepository, barbershopRepository);

  router.get(
    '/barbershops/:barbershopId/reports/financial/pdf',
    authMiddleware,
    membershipMiddleware,
    ExpressAdapter.create(controller.financialPdf),
  );

  router.get(
    '/barbershops/:barbershopId/reports/financial/excel',
    authMiddleware,
    membershipMiddleware,
    ExpressAdapter.create(controller.financialExcel),
  );

  router.get(
    '/barbershops/:barbershopId/reports/commissions/pdf',
    authMiddleware,
    membershipMiddleware,
    ExpressAdapter.create(controller.commissionsPdf),
  );

  router.get(
    '/barbershops/:barbershopId/reports/commissions/excel',
    authMiddleware,
    membershipMiddleware,
    ExpressAdapter.create(controller.commissionsExcel),
  );

  router.get(
    '/barbershops/:barbershopId/reports/customers/pdf',
    authMiddleware,
    membershipMiddleware,
    ExpressAdapter.create(controller.customersPdf),
  );

  router.get(
    '/barbershops/:barbershopId/reports/customers/excel',
    authMiddleware,
    membershipMiddleware,
    ExpressAdapter.create(controller.customersExcel),
  );

  return router;
}
