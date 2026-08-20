import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import AuthenticateAdminUseCase from '@/application/useCases/admin/AuthenticateAdmin';
import CreateAdminUseCase from '@/application/useCases/admin/CreateAdmin';
import DeleteAdminUseCase from '@/application/useCases/admin/DeleteAdmin';
import ListAdminsUseCase from '@/application/useCases/admin/ListAdmins';
import { Admin } from '@/domain/entities';
import IAdminRepository from '@/domain/repository/AdminRepository';
import HashRepository from '@/domain/repository/HashRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import { setAuthCookies, clearAuthCookies } from '@/infra/http/helpers/authCookie';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import AdminRepositoryMemory from '@/infra/repositories/inMemory/admin/adminRepositoryMemory';

type AdminOutputDTO = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

export default class AdminController {
  private readonly adminRepository: IAdminRepository;
  private readonly authenticateAdminUseCase: AuthenticateAdminUseCase;
  private readonly createAdminUseCase: CreateAdminUseCase;
  private readonly listAdminsUseCase: ListAdminsUseCase;
  private readonly deleteAdminUseCase: DeleteAdminUseCase;

  constructor(
    adminRepository: IAdminRepository = new AdminRepositoryMemory(),
    hashService: HashRepository = new BcryptHashService(),
    tokenService: ITokenService = new JwtTokenService(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.adminRepository = adminRepository;
    this.authenticateAdminUseCase = new AuthenticateAdminUseCase(
      adminRepository,
      hashService,
      tokenService,
    );
    this.createAdminUseCase = new CreateAdminUseCase(
      adminRepository,
      hashService,
      undefined,
      auditService,
    );
    this.listAdminsUseCase = new ListAdminsUseCase(adminRepository);
    this.deleteAdminUseCase = new DeleteAdminUseCase(adminRepository, auditService);
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.authenticateAdminUseCase.execute({
        email: req.body.email,
        password: req.body.password,
      });

      setAuthCookies(res, output.accessToken, output.refreshToken);

      return res.status(200).json({ admin: output.admin });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Admin não encontrado' || error.message === 'Admin inativo') {
          return res.status(404).json({ message: error.message });
        }

        if (error.message === 'Senha incorreta') {
          return res.status(401).json({ message: error.message });
        }

        if (error.message === 'Email é obrigatório' || error.message === 'Senha é obrigatória') {
          return res.status(400).json({ message: error.message });
        }
      }

      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.createAdminUseCase.execute(
        {
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
        },
        buildAuditContext(req),
      );

      return res.status(201).json(output);
    } catch (error) {
      next(error);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await this.listAdminsUseCase.execute();
      return res.status(200).json(admins.map(toAdminOutput));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.deleteAdminUseCase.execute(id, buildAuditContext(req));
      return res.status(200).json({ message: 'Admin excluído com sucesso' });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.userId;
      if (!adminId) {
        return res.status(401).json({ message: 'Token não fornecido' });
      }

      const admin = await this.adminRepository.findById(adminId);
      if (!admin) {
        return res.status(404).json({ message: 'Admin não encontrado' });
      }

      return res.status(200).json(toAdminOutput(admin));
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      clearAuthCookies(res);
      return res.status(200).json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      next(error);
    }
  };
}

function toAdminOutput(admin: Admin): AdminOutputDTO {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isActive: admin.isActive,
  };
}
