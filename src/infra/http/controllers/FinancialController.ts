import { NextFunction, Request, Response } from 'express';

import GetFinancialDashboardUseCase from '@/application/useCases/finance/GetFinancialDashboard';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';

export default class FinancialController {
  private readonly getFinancialDashboardUseCase: GetFinancialDashboardUseCase;

  constructor(
    appointmentRepository: IAppointmentRepository = new AppointmentRepositoryMemory(),
    commissionRepository: ICommissionRepository = new CommissionRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    workingHoursRepository: IWorkingHoursRepository = new WorkingHoursRepositoryMemory(),
  ) {
    this.getFinancialDashboardUseCase = new GetFinancialDashboardUseCase(
      appointmentRepository,
      commissionRepository,
      userBarbershopRepository,
      workingHoursRepository,
    );
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
}
