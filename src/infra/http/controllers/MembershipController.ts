import { NextFunction, Request, Response } from 'express';

import AddBarberToBarbershopUseCase from '@/application/useCases/membership/AddBarber';
import ListMembershipsUseCase from '@/application/useCases/membership/List';
import SwitchBarbershopUseCase from '@/application/useCases/membership/Switch';
import { UserBarbershop } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

type MembershipOutputDTO = {
  id: string;
  userId: string;
  barbershopId: string;
  status: string;
  localRole: string;
};

export default class MembershipController {
  private readonly listMembershipsUseCase: ListMembershipsUseCase;
  private readonly addBarberUseCase: AddBarberToBarbershopUseCase;
  private readonly switchBarbershopUseCase: SwitchBarbershopUseCase;

  constructor(
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    userRepository: IUserRepository = new UserRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
  ) {
    this.listMembershipsUseCase = new ListMembershipsUseCase(userBarbershopRepository);
    this.addBarberUseCase = new AddBarberToBarbershopUseCase(
      userBarbershopRepository,
      userRepository,
      barbershopRepository,
    );
    this.switchBarbershopUseCase = new SwitchBarbershopUseCase(userBarbershopRepository);
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberships = await this.listMembershipsUseCase.execute(req.userId as string);
      return res.status(200).json(memberships.map(toMembershipOutput));
    } catch (error) {
      next(error);
    }
  };

  addBarber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const membership = await this.addBarberUseCase.execute({
        userId: req.body.userId,
        barbershopId: req.body.barbershopId,
      });

      return res.status(201).json(toMembershipOutput(membership));
    } catch (error) {
      next(error);
    }
  };

  switch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.switchBarbershopUseCase.execute(req.userId as string, req.body.barbershopId);

      const memberships = await this.listMembershipsUseCase.execute(req.userId as string);
      return res.status(200).json(memberships.map(toMembershipOutput));
    } catch (error) {
      next(error);
    }
  };
}

function toMembershipOutput(membership: UserBarbershop): MembershipOutputDTO {
  return {
    id: membership.id,
    userId: membership.userId,
    barbershopId: membership.barbershopId,
    status: membership.status,
    localRole: membership.localRole,
  };
}
