import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import CreateServiceUseCase from '@/application/useCases/service/Create';
import ListServicesUseCase from '@/application/useCases/service/List';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

export default class ServiceController {
  private readonly createServiceUseCase: CreateServiceUseCase;
  private readonly listServicesUseCase: ListServicesUseCase;

  constructor(
    serviceRepository: IServiceRepository = new ServiceRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.createServiceUseCase = new CreateServiceUseCase(
      serviceRepository,
      barbershopRepository,
      auditService,
    );
    this.listServicesUseCase = new ListServicesUseCase(serviceRepository);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const output = await this.createServiceUseCase.execute(
        {
          barbershopId:
            req.barbershopId ??
            (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId),
          name: req.body.name,
          priceCents: req.body.priceCents,
          durationMinutes: req.body.durationMinutes,
        },
        buildAuditContext(req),
      );

      return res.status(201).json(output);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const services = await this.listServicesUseCase.execute(
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId),
      );
      return res.status(200).json(services);
    } catch (error) {
      next(error);
    }
  };
}
