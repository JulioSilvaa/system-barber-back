import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import GetWorkingHoursUseCase from '@/application/useCases/workingHours/Get';
import UpdateWorkingHoursUseCase from '@/application/useCases/workingHours/Update';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import { emitDataChanged } from '@/infra/websocket/socketServer';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

export default class WorkingHoursController {
  private readonly getWorkingHoursUseCase: GetWorkingHoursUseCase;
  private readonly updateWorkingHoursUseCase: UpdateWorkingHoursUseCase;

  constructor(
    workingHoursRepository: IWorkingHoursRepository = new WorkingHoursRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.getWorkingHoursUseCase = new GetWorkingHoursUseCase(workingHoursRepository);
    this.updateWorkingHoursUseCase = new UpdateWorkingHoursUseCase(
      workingHoursRepository,
      barbershopRepository,
      auditService,
    );
  }

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.barbershopId ?? req.params.identifier;
      const barbershopId = req.barbershopId ?? (Array.isArray(rawId) ? rawId[0] : rawId);
      const hours = await this.getWorkingHoursUseCase.execute(barbershopId);
      return res.status(200).json(hours);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.barbershopId;
      const barbershopId = req.barbershopId ?? (Array.isArray(rawId) ? rawId[0] : rawId);
      const hours = await this.updateWorkingHoursUseCase.execute(
        { barbershopId, days: req.body.days },
        buildAuditContext(req),
      );
      emitDataChanged(barbershopId);
      return res.status(200).json(hours);
    } catch (error) {
      next(error);
    }
  };
}
