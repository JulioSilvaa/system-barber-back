import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import AdminController from '../controllers/AdminController';
import { requireAdmin, requireAuth } from '@/infra/middleware/AuthMiddleware';
import AuditService from '@/application/services/AuditService';
import IAdminRepository from '@/domain/repository/AdminRepository';
import HashRepository from '@/domain/repository/HashRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import AdminRepositoryMemory from '@/infra/repositories/inMemory/admin/adminRepositoryMemory';

export interface AdminRoutesDeps {
  adminRepository: IAdminRepository;
  hashService: HashRepository;
  tokenService: ITokenService;
  auditService: AuditService;
}

export default function createAdminRoutes(deps?: Partial<AdminRoutesDeps>) {
  const router = Router();

  const adminRepository = deps?.adminRepository ?? new AdminRepositoryMemory();
  const hashService = deps?.hashService ?? new BcryptHashService();
  const tokenService = deps?.tokenService ?? new JwtTokenService();
  const auditService = deps?.auditService ?? new AuditService(new AuditRepositoryMemory());

  const controller = new AdminController(adminRepository, hashService, tokenService, auditService);

  router.post('/admin/login', ExpressAdapter.create(controller.login));
  router.post('/admins', requireAuth, requireAdmin, ExpressAdapter.create(controller.create));
  router.get('/admins', requireAuth, requireAdmin, ExpressAdapter.create(controller.list));
  router.delete('/admins/:id', requireAuth, requireAdmin, ExpressAdapter.create(controller.delete));

  return router;
}
