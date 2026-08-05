import { NextFunction, Request, Response } from 'express';

import CreateServiceUseCase from '@/application/useCases/service/Create';
import ListServicesUseCase from '@/application/useCases/service/List';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

export default class ServiceController {
  private readonly createServiceUseCase: CreateServiceUseCase;
  private readonly listServicesUseCase: ListServicesUseCase;

  constructor(
    serviceRepository: IServiceRepository = new ServiceRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
  ) {
    this.createServiceUseCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);
    this.listServicesUseCase = new ListServicesUseCase(serviceRepository);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.createServiceUseCase.execute({
        barbershopId: req.params.barbershopId,
        name: req.body.name,
        priceCents: req.body.priceCents,
        durationMinutes: req.body.durationMinutes,
      });

      return res.status(201).json(output);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const services = await this.listServicesUseCase.execute(req.params.barbershopId);
      return res.status(200).json(services);
    } catch (error) {
      next(error);
    }
  };
}
