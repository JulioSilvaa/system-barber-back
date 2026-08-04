import { NextFunction, Request, Response } from 'express';

import CreateBarberShopUseCase from '@/application/useCases/barberShop/Create';
import ListBarbershopsUseCase from '@/application/useCases/barberShop/List';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import CryptoUuidGenerator from '@/infra/helpers/IdGenerator';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export default class BarbershopController {
  private readonly createBarbershopUseCase: CreateBarberShopUseCase;
  private readonly listBarbershopsUseCase: ListBarbershopsUseCase;

  constructor(
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
  ) {
    this.createBarbershopUseCase = new CreateBarberShopUseCase(
      barbershopRepository,
      new CryptoUuidGenerator(),
      userBarbershopRepository,
    );
    this.listBarbershopsUseCase = new ListBarbershopsUseCase(barbershopRepository);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.createBarbershopUseCase.execute({
        name: req.body.name,
        slug: req.body.slug,
        phone: req.body.phone,
        password: req.body.password,
        ownerId: req.userId,
      });

      return res.status(201).json(output);
    } catch (error) {
      next(error);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershops = await this.listBarbershopsUseCase.execute();
      return res.status(200).json(barbershops);
    } catch (error) {
      next(error);
    }
  };
}
