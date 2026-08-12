import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import CreateUserUseCase from '@/application/useCases/user/Create';
import DeleteUserUseCase from '@/application/useCases/user/Delete';
import ListUserUseCase from '@/application/useCases/user/List';
import { UserBarbershop } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import { emitDataChanged } from '@/infra/websocket/socketServer';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export default class UserController {
  private readonly createUserUseCase: CreateUserUseCase;
  private readonly deleteUserUseCase: DeleteUserUseCase;
  private readonly listUserUseCase: ListUserUseCase;
  private readonly userBarbershopRepository: IUserBarbershopRepository;
  private readonly auditService: AuditService;

  constructor(
    userRepository: IUserRepository = new UserRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.createUserUseCase = new CreateUserUseCase(userRepository, undefined, auditService);
    this.deleteUserUseCase = new DeleteUserUseCase(userRepository, auditService);
    this.listUserUseCase = new ListUserUseCase(userRepository);
    this.userBarbershopRepository = userBarbershopRepository;
    this.auditService = auditService;
  }

  add = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auditCtx = buildAuditContext(req);
      const output = await this.createUserUseCase.execute(
        {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
        },
        auditCtx,
      );

      const barbershopId: string | undefined = req.body.barbershopId;
      if (barbershopId) {
        const existing = await this.userBarbershopRepository.findByUserAndBarbershop(
          output.id,
          barbershopId,
        );

        if (existing) {
          throw new Error('Vínculo já existente');
        }

        const membership = await this.userBarbershopRepository.save(
          new UserBarbershop({
            id: randomUUID(),
            userId: output.id,
            barbershopId,
            localRole: 'BARBER',
          }),
        );

        await this.auditService.record({
          ...auditCtx,
          barbershopId,
          action: 'CREATE',
          entityType: 'MEMBERSHIP',
          entityId: membership.id,
          after: {
            id: membership.id,
            userId: membership.userId,
            barbershopId: membership.barbershopId,
            localRole: membership.localRole,
          },
        });

        emitDataChanged(barbershopId);
      }

      return res.status(201).json(output);
    } catch (error) {
      next(error);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.listUserUseCase.execute();
      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (typeof id !== 'string') {
        return res.status(400).json({ message: 'ID inválido' });
      }

      await this.deleteUserUseCase.execute(id, buildAuditContext(req));

      return res.status(200).json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      next(error);
    }
  };
}
