import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import CreateBarberShopUseCase from '@/application/useCases/barberShop/Create';
import ListBarbershopsUseCase from '@/application/useCases/barberShop/List';
import ListBarbersUseCase from '@/application/useCases/barberShop/ListBarbers';
import ListBarbershopStaffUseCase from '@/application/useCases/barberShop/ListBarbershopStaff';
import UpdateBarbershopStatusUseCase from '@/application/useCases/barberShop/UpdateBarbershopStatus';
import UpdateBrandingUseCase from '@/application/useCases/barberShop/UpdateBranding';
import AuthenticateBarbershopUseCase from '@/application/useCases/auth/AuthenticateBarbershop';
import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import HashRepository from '@/domain/repository/HashRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import { emitDataChanged } from '@/infra/websocket/socketServer';
import { setAuthCookies, clearAuthCookies } from '@/infra/http/helpers/authCookie';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import CryptoUuidGenerator from '@/infra/helpers/IdGenerator';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';

type BarbershopOutputDTO = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  primaryColor?: string;
  logoUrl?: string;
  isActive: boolean;
};

export default class BarbershopController {
  private readonly barbershopRepository: IBarbershopRepository;
  private readonly createBarbershopUseCase: CreateBarberShopUseCase;
  private readonly listBarbershopsUseCase: ListBarbershopsUseCase;
  private readonly listBarbersUseCase: ListBarbersUseCase;
  private readonly listBarbershopStaffUseCase: ListBarbershopStaffUseCase;
  private readonly updateBarbershopStatusUseCase: UpdateBarbershopStatusUseCase;
  private readonly updateBrandingUseCase: UpdateBrandingUseCase;
  private readonly authenticateBarbershopUseCase: AuthenticateBarbershopUseCase;

  constructor(
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    hashService: HashRepository = new BcryptHashService(),
    tokenService: ITokenService = new JwtTokenService(),
    userRepository: IUserRepository = new UserRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.barbershopRepository = barbershopRepository;
    this.createBarbershopUseCase = new CreateBarberShopUseCase(
      barbershopRepository,
      new CryptoUuidGenerator(),
      hashService,
      auditService,
    );
    this.listBarbershopsUseCase = new ListBarbershopsUseCase(barbershopRepository);
    this.authenticateBarbershopUseCase = new AuthenticateBarbershopUseCase(
      barbershopRepository,
      hashService,
      tokenService,
    );
    this.listBarbersUseCase = new ListBarbersUseCase(userBarbershopRepository, userRepository);
    this.listBarbershopStaffUseCase = new ListBarbershopStaffUseCase(
      userBarbershopRepository,
      userRepository,
    );
    this.updateBarbershopStatusUseCase = new UpdateBarbershopStatusUseCase(
      barbershopRepository,
      auditService,
    );
    this.updateBrandingUseCase = new UpdateBrandingUseCase(barbershopRepository, auditService);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.createBarbershopUseCase.execute(
        {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          password: req.body.password,
        },
        buildAuditContext(req),
      );

      return res.status(201).json(toBarbershopOutput(output));
    } catch (error) {
      next(error);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershops = await this.listBarbershopsUseCase.execute();
      return res.status(200).json(barbershops.map(toBarbershopOutput));
    } catch (error) {
      next(error);
    }
  };

  getPublic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.barbershopId) {
        return res.status(404).json({ message: 'Barbearia não encontrada' });
      }

      const barbershop = await this.barbershopRepository.findById(req.barbershopId);
      if (!barbershop || !barbershop.isActive) {
        return res.status(404).json({ message: 'Barbearia não encontrada' });
      }

      return res.status(200).json(toBarbershopOutput(barbershop));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.authenticateBarbershopUseCase.execute({
        email: req.body.email,
        password: req.body.password,
      });

      setAuthCookies(res, output.accessToken, output.refreshToken);

      return res.status(200).json(output);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Barbearia não encontrada' || error.message === 'Barbearia inativa') {
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

  listBarbers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawIdentifier = req.params.identifier;
      const identifier =
        req.barbershopId ?? (Array.isArray(rawIdentifier) ? rawIdentifier[0] : rawIdentifier);
      const barbers = await this.listBarbersUseCase.execute(identifier);
      return res.status(200).json(barbers);
    } catch (error) {
      next(error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logout = async (_req: Request, res: Response, _next: NextFunction) => {
    clearAuthCookies(res);
    return res.status(204).send();
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.actor !== 'BARBERSHOP' || !req.userId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const barbershop = await this.barbershopRepository.findById(req.userId);
      if (!barbershop) {
        return res.status(404).json({ message: 'Barbearia não encontrada' });
      }

      return res.status(200).json(toBarbershopOutput(barbershop));
    } catch (error) {
      next(error);
    }
  };

  listStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.barbershopId;
      const barbershopId = req.barbershopId ?? (Array.isArray(rawId) ? rawId[0] : rawId);
      const staff = await this.listBarbershopStaffUseCase.execute(barbershopId);
      return res.status(200).json(staff);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const isActive = Boolean(req.body.isActive);

      const barbershop = await this.updateBarbershopStatusUseCase.execute(
        { barbershopId, isActive },
        buildAuditContext(req),
      );

      return res.status(200).json(toBarbershopOutput(barbershop));
    } catch (error) {
      next(error);
    }
  };

  updateBranding = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name, primaryColor, logoUrl } = req.body ?? {};

      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        throw new Error('name must be a non-empty string');
      }
      if (primaryColor !== undefined && typeof primaryColor !== 'string') {
        throw new Error('primaryColor must be a string');
      }
      if (logoUrl !== undefined && typeof logoUrl !== 'string') {
        throw new Error('logoUrl must be a string');
      }

      const barbershop = await this.updateBrandingUseCase.execute(
        {
          barbershopId,
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(primaryColor !== undefined ? { primaryColor } : {}),
          ...(logoUrl !== undefined ? { logoUrl } : {}),
        },
        buildAuditContext(req),
      );

      emitDataChanged(barbershopId);
      return res.status(200).json(toBarbershopOutput(barbershop));
    } catch (error) {
      next(error);
    }
  };

  uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new Error('logo file is required');
      }

      const barbershopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const version = Date.now();
      const logoUrl = `/uploads/${req.file.filename}?v=${version}`;

      const barbershop = await this.updateBrandingUseCase.execute(
        { barbershopId, logoUrl },
        buildAuditContext(req),
      );

      emitDataChanged(barbershopId);
      return res.status(200).json({ logoUrl: barbershop.logoUrl });
    } catch (error) {
      next(error);
    }
  };
}

function toBarbershopOutput(barbershop: Barbershop): BarbershopOutputDTO {
  return {
    id: barbershop.id,
    name: barbershop.name,
    slug: barbershop.slug,
    email: barbershop.email,
    phone: barbershop.phone,
    primaryColor: barbershop.primaryColor,
    logoUrl: barbershop.logoUrl,
    isActive: barbershop.isActive,
  };
}
