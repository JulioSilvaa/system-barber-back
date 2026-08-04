import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import AuthController from '../controllers/AuthController';
import HashRepository from '@/domain/repository/HashRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface AuthRoutesDeps {
  userRepository: IUserRepository;
  hashService: HashRepository;
  tokenService: ITokenService;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createAuthRoutes(deps?: Partial<AuthRoutesDeps>) {
  const router = Router();

  const controller = new AuthController(
    deps?.userRepository ?? new UserRepositoryMemory(),
    deps?.hashService ?? new BcryptHashService(),
    deps?.tokenService ?? new JwtTokenService(),
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory(),
  );

  router.post('/auth/login', ExpressAdapter.create(controller.login));

  return router;
}
