import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import BarbershopController from '../controllers/BarbershopController';
import { uploadLogo } from '@/infra/http/helpers/logoUpload';
import {
  requireAuth,
  requireBarbershopSelf,
  resolveBarbershop,
} from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import HashRepository from '@/domain/repository/HashRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import type { PrismaClient } from '@/generated/prisma/client';

export interface BarbershopRoutesDeps {
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  userRepository: IUserRepository;
  hashService: HashRepository;
  tokenService: ITokenService;
  auditService: AuditService;
  prisma?: PrismaClient;
}

export default function createBarbershopRoutes(deps?: Partial<BarbershopRoutesDeps>) {
  const router = Router();

  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const userRepository = deps?.userRepository ?? new UserRepositoryMemory();
  const hashService = deps?.hashService ?? new BcryptHashService();
  const tokenService = deps?.tokenService ?? new JwtTokenService();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new BarbershopController(
    barbershopRepository,
    userBarbershopRepository,
    hashService,
    tokenService,
    userRepository,
    auditService,
    deps?.prisma,
  );

  router.post('/barbershops/login', ExpressAdapter.create(controller.login));
  router.post('/barbershops', ExpressAdapter.create(controller.create));
  router.get('/barbershops/me', requireAuth, ExpressAdapter.create(controller.me));
  router.post('/barbershops/logout', ExpressAdapter.create(controller.logout));
  router.get(
    '/barbershops/:identifier',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.getPublic),
  );
  router.patch(
    '/barbershops/:id/status',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.updateStatus),
  );
  router.get(
    '/barbershops/:identifier/barbers',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.listBarbers),
  );

  router.get(
    '/barbershops/:barbershopId/employees',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.listStaff),
  );

  router.patch(
    '/barbershops/:id/branding',
    requireAuth,
    requireBarbershopSelf,
    ExpressAdapter.create(controller.updateBranding),
  );
  router.post(
    '/barbershops/:id/branding/logo',
    requireAuth,
    requireBarbershopSelf,
    uploadLogo.single('logo'),
    ExpressAdapter.create(controller.uploadLogo),
  );

  return router;
}
