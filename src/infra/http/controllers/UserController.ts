import { Request, Response, NextFunction } from 'express';

import { CreateUserInputDTO } from '@/application/dtos/UserDto';
import CreateUserUseCase from '@/application/useCases/user/Create';
import DeleteUserUseCase from '@/application/useCases/user/Delete';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';

const userRepository = new UserRepositoryMemory();

export default class UserController {
  static async add(req: Request, res: Response, next: NextFunction) {
    try {
      const createUser = new CreateUserUseCase(userRepository);

      const input: CreateUserInputDTO = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        barbershopId: req.body.barbershopId,
        password: req.body.password,
        role: req.body.role,
      };

      const output = await createUser.execute(input);
      return res.status(201).json(output);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (typeof id !== 'string') {
        return res.status(400).json({ message: 'ID inválido' });
      }

      const deleteUserUseCase = new DeleteUserUseCase(userRepository);
      await deleteUserUseCase.execute(id);

      return res.status(200).json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}
