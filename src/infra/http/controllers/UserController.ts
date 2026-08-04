import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

import CreateUserUseCase from '@/application/useCases/user/Create';
import DeleteUserUseCase from '@/application/useCases/user/Delete';
import ListUserUseCase from '@/application/useCases/user/List';
import UpdateUserRoleUseCase from '@/application/useCases/user/UpdateRole';
import { UserBarbershop } from '@/domain/entities';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export default class UserController {
  private readonly createUserUseCase: CreateUserUseCase;
  private readonly deleteUserUseCase: DeleteUserUseCase;
  private readonly listUserUseCase: ListUserUseCase;
  private readonly updateUserRoleUseCase: UpdateUserRoleUseCase;
  private readonly userBarbershopRepository: IUserBarbershopRepository;

  constructor(
    userRepository: IUserRepository = new UserRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
  ) {
    this.createUserUseCase = new CreateUserUseCase(userRepository);
    this.deleteUserUseCase = new DeleteUserUseCase(userRepository);
    this.listUserUseCase = new ListUserUseCase(userRepository);
    this.updateUserRoleUseCase = new UpdateUserRoleUseCase(userRepository);
    this.userBarbershopRepository = userBarbershopRepository;
  }

  add = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.createUserUseCase.execute({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
      });

      const barbershopId: string | undefined = req.body.barbershopId;
      if (barbershopId) {
        const existing = await this.userBarbershopRepository.findByUserAndBarbershop(
          output.id,
          barbershopId,
        );

        if (existing) {
          throw new Error('Vínculo já existente');
        }

        await this.userBarbershopRepository.save(
          new UserBarbershop({
            id: randomUUID(),
            userId: output.id,
            barbershopId,
            localRole: 'BARBER',
          }),
        );
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

      await this.deleteUserUseCase.execute(id);

      return res.status(200).json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      next(error);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { globalRole } = req.body;

      if (typeof id !== 'string') {
        return res.status(400).json({ message: 'ID inválido' });
      }

      const updatedRole = await this.updateUserRoleUseCase.execute(id, globalRole);

      return res.status(200).json({ id, globalRole: updatedRole });
    } catch (error) {
      next(error);
    }
  };
}
