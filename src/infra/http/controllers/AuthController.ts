import { NextFunction, Request, Response } from 'express';

import AuthenticateUserUseCase from '@/application/useCases/auth/Authenticate';
import HashRepository from '@/domain/repository/HashRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export default class AuthController {
  private readonly authenticateUseCase: AuthenticateUserUseCase;

  constructor(
    userRepository: IUserRepository = new UserRepositoryMemory(),
    hashService: HashRepository = new BcryptHashService(),
    tokenService: ITokenService = new JwtTokenService(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
  ) {
    this.authenticateUseCase = new AuthenticateUserUseCase(
      userRepository,
      hashService,
      tokenService,
      userBarbershopRepository,
    );
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.authenticateUseCase.execute({
        email: req.body.email,
        password: req.body.password,
      });

      return res.status(200).json(output);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Usuário não encontrado') {
          return res.status(404).json({ message: error.message });
        }

        if (error.message === 'Senha incorreta') {
          return res.status(401).json({ message: error.message });
        }

        if (
          error.message === 'Email do usuário é obrigatório' ||
          error.message === 'Senha é obrigatória'
        ) {
          return res.status(400).json({ message: error.message });
        }
      }

      next(error);
    }
  };
}
