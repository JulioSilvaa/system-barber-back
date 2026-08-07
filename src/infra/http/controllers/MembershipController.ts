import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import AddBarberToBarbershopUseCase from '@/application/useCases/membership/AddBarber';
import ListMembershipsUseCase from '@/application/useCases/membership/List';
import ListBarbershopMembershipsUseCase from '@/application/useCases/membership/ListByBarbershop';
import RemoveBarberUseCase from '@/application/useCases/membership/RemoveBarber';
import SwitchBarbershopUseCase from '@/application/useCases/membership/Switch';
import UpdateBarberStatusUseCase from '@/application/useCases/membership/UpdateBarberStatus';
import { UserBarbershop } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
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
  private readonly listBarbershopMembershipsUseCase: ListBarbershopMembershipsUseCase;
  private readonly updateBarberStatusUseCase: UpdateBarberStatusUseCase;
  private readonly removeBarberUseCase: RemoveBarberUseCase;

  constructor(
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    userRepository: IUserRepository = new UserRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.listMembershipsUseCase = new ListMembershipsUseCase(userBarbershopRepository);
    this.addBarberUseCase = new AddBarberToBarbershopUseCase(
      userBarbershopRepository,
      userRepository,
      barbershopRepository,
      auditService,
    );
    this.switchBarbershopUseCase = new SwitchBarbershopUseCase(
      userBarbershopRepository,
      auditService,
    );
    this.listBarbershopMembershipsUseCase = new ListBarbershopMembershipsUseCase(
      userBarbershopRepository,
    );
    this.updateBarberStatusUseCase = new UpdateBarberStatusUseCase(
      userBarbershopRepository,
      auditService,
    );
    this.removeBarberUseCase = new RemoveBarberUseCase(userBarbershopRepository, auditService);
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
      const membership = await this.addBarberUseCase.execute(
        {
          userId: req.body.userId,
          barbershopId: req.body.barbershopId,
        },
        buildAuditContext(req),
      );

      return res.status(201).json(toMembershipOutput(membership));
    } catch (error) {
      next(error);
    }
  };

  switch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.switchBarbershopUseCase.execute(
        req.userId as string,
        req.body.barbershopId,
        buildAuditContext(req),
      );

      const memberships = await this.listMembershipsUseCase.execute(req.userId as string);
      return res.status(200).json(memberships.map(toMembershipOutput));
    } catch (error) {
      next(error);
    }
  };

  listByBarbershop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.barbershopId)
        ? req.params.barbershopId[0]
        : req.params.barbershopId;
      const memberships = await this.listBarbershopMembershipsUseCase.execute(barbershopId);
      return res.status(200).json(memberships.map(toMembershipOutput));
    } catch (error) {
      next(error);
    }
  };

  updateBarberStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.barbershopId)
        ? req.params.barbershopId[0]
        : req.params.barbershopId;
      const membershipId = Array.isArray(req.params.membershipId)
        ? req.params.membershipId[0]
        : req.params.membershipId;

      const membership = await this.updateBarberStatusUseCase.execute(
        {
          barbershopId,
          membershipId,
          isActive: Boolean(req.body.isActive),
        },
        buildAuditContext(req),
      );

      return res.status(200).json(toMembershipOutput(membership));
    } catch (error) {
      next(error);
    }
  };

  removeBarber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.barbershopId)
        ? req.params.barbershopId[0]
        : req.params.barbershopId;
      const membershipId = Array.isArray(req.params.membershipId)
        ? req.params.membershipId[0]
        : req.params.membershipId;

      await this.removeBarberUseCase.execute(
        { barbershopId, membershipId },
        buildAuditContext(req),
      );

      return res.status(200).json({ message: 'Barbeiro removido com sucesso' });
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
