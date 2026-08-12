import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import FinancialController from '../controllers/FinancialController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

export interface FinanceRoutesDeps {
  appointmentRepository: IAppointmentRepository;
  commissionRepository: ICommissionRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  workingHoursRepository: IWorkingHoursRepository;
  barbershopRepository: IBarbershopRepository;
}

export default function createFinanceRoutes(deps?: FinanceRoutesDeps) {
  const router = Router();

  const appointmentRepository = deps?.appointmentRepository ?? new AppointmentRepositoryMemory();
  const commissionRepository = deps?.commissionRepository ?? new CommissionRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const workingHoursRepository = deps?.workingHoursRepository ?? new WorkingHoursRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();

  const controller = new FinancialController(
    appointmentRepository,
    commissionRepository,
    userBarbershopRepository,
    workingHoursRepository,
  );

  router.get(
    '/barbershops/:barbershopId/financial/dashboard',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.dashboard),
  );

  return router;
}
