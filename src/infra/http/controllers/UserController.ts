import { Request, Response, NextFunction } from 'express';

import { CreateUserInputDTO } from '@/application/dtos/UserDto';
import CreateUserUseCase from '@/application/useCases/user/Create';
import BCryptHashProvider from '@/infra/helpers/BcryptHash';
import UUIDGenerator from '@/infra/helpers/IdGenerator';
import UserRepositoryMemory from '../../repositories/inMemory/user/userRepositoryMemory';

export default class UserController {
  static async add(req: Request, res: Response, next: NextFunction) {
    try {
      const createUserUseCase = new CreateUserUseCase(
        new UserRepositoryMemory(),
        new BCryptHashProvider(),
        new UUIDGenerator(),
      );

      const input: CreateUserInputDTO = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        barbershopId: req.body.barbershopId,
        password: req.body.password,
        role: req.body.role,
      };

      const output = await createUserUseCase.execute(input);
      return res.status(201).json(output);
    } catch (error) {
      next(error);
    }
  }
}
