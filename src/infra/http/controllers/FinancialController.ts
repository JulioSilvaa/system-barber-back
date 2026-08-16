import { NextFunction, Request, Response } from 'express';

import AddFinanceEntryUseCase, {
  AddFinanceEntryInputDTO,
} from '@/application/useCases/finance/AddFinanceEntry';
import GetFinancialDashboardUseCase from '@/application/useCases/finance/GetFinancialDashboard';
import ListFinanceEntriesUseCase from '@/application/useCases/finance/ListFinanceEntries';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';
import FinanceEntryRepositoryMemory from '@/infra/repositories/inMemory/financeEntry/financeEntryRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';

export default class FinancialController {
  private readonly getFinancialDashboardUseCase: GetFinancialDashboardUseCase;
  private readonly addFinanceEntryUseCase: AddFinanceEntryUseCase;
  private readonly listFinanceEntriesUseCase: ListFinanceEntriesUseCase;

  constructor(
    appointmentRepository: IAppointmentRepository = new AppointmentRepositoryMemory(),
    commissionRepository: ICommissionRepository = new CommissionRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    workingHoursRepository: IWorkingHoursRepository = new WorkingHoursRepositoryMemory(),
    financeEntryRepository: IFinanceEntryRepository = new FinanceEntryRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    serviceRepository: IServiceRepository = new ServiceRepositoryMemory(),
    userRepository: IUserRepository = new UserRepositoryMemory(),
  ) {
    this.getFinancialDashboardUseCase = new GetFinancialDashboardUseCase(
      appointmentRepository,
      commissionRepository,
      userBarbershopRepository,
      workingHoursRepository,
      serviceRepository,
      userRepository,
    );
    this.addFinanceEntryUseCase = new AddFinanceEntryUseCase(
      financeEntryRepository,
      barbershopRepository,
    );
    this.listFinanceEntriesUseCase = new ListFinanceEntriesUseCase(financeEntryRepository);
  }

  dashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);

      const dashboard = await this.getFinancialDashboardUseCase.execute(barbershopId);
      return res.status(200).json(dashboard);
    } catch (error) {
      next(error);
    }
  };

  addEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);

      const input: AddFinanceEntryInputDTO = {
        barbershopId,
        kind: req.body.kind,
        amountCents: req.body.amountCents,
        category: req.body.category,
        description: req.body.description,
      };

      const entry = await this.addFinanceEntryUseCase.execute(input);
      return res.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  };

  listEntries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);

      const date = req.query.date ? new Date(String(req.query.date)) : null;
      const entries = await this.listFinanceEntriesUseCase.execute(barbershopId, date);
      return res.status(200).json({ entries });
    } catch (error) {
      next(error);
    }
  };
}
