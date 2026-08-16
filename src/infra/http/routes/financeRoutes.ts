import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import FinancialController from '../controllers/FinancialController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import FinanceEntryRepositoryMemory from '@/infra/repositories/inMemory/financeEntry/financeEntryRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';

export interface FinanceRoutesDeps {
  appointmentRepository: IAppointmentRepository;
  commissionRepository: ICommissionRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  workingHoursRepository: IWorkingHoursRepository;
  barbershopRepository: IBarbershopRepository;
  financeEntryRepository: IFinanceEntryRepository;
  serviceRepository?: IServiceRepository;
  userRepository?: IUserRepository;
}

export default function createFinanceRoutes(deps?: FinanceRoutesDeps) {
  const router = Router();

  const appointmentRepository = deps?.appointmentRepository ?? new AppointmentRepositoryMemory();
  const commissionRepository = deps?.commissionRepository ?? new CommissionRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const workingHoursRepository = deps?.workingHoursRepository ?? new WorkingHoursRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const financeEntryRepository = deps?.financeEntryRepository ?? new FinanceEntryRepositoryMemory();

  const controller = new FinancialController(
    appointmentRepository,
    commissionRepository,
    userBarbershopRepository,
    workingHoursRepository,
    financeEntryRepository,
    barbershopRepository,
    deps?.serviceRepository ?? new ServiceRepositoryMemory(),
    deps?.userRepository ?? new UserRepositoryMemory(),
  );

  router.get(
    '/barbershops/:barbershopId/finance/dashboard',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.dashboard),
  );

  router.get(
    '/barbershops/:barbershopId/finance/entries',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.listEntries),
  );

  router.post(
    '/barbershops/:barbershopId/finance/entries',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.addEntry),
  );

  return router;
}
