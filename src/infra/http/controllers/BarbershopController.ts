import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import CreateBarberShopUseCase from '@/application/useCases/barberShop/Create';
import ListBarbershopsUseCase from '@/application/useCases/barberShop/List';
import ListBarbersUseCase from '@/application/useCases/barberShop/ListBarbers';
import ListBarbershopStaffUseCase from '@/application/useCases/barberShop/ListBarbershopStaff';
import UpdateBarbershopStatusUseCase from '@/application/useCases/barberShop/UpdateBarbershopStatus';
import AuthenticateBarbershopUseCase from '@/application/useCases/auth/AuthenticateBarbershop';
import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import HashRepository from '@/domain/repository/HashRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
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
  isActive: boolean;
};

export default class BarbershopController {
  private readonly createBarbershopUseCase: CreateBarberShopUseCase;
  private readonly listBarbershopsUseCase: ListBarbershopsUseCase;
  private readonly listBarbersUseCase: ListBarbersUseCase;
  private readonly listBarbershopStaffUseCase: ListBarbershopStaffUseCase;
  private readonly updateBarbershopStatusUseCase: UpdateBarbershopStatusUseCase;

  constructor(
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    hashService: HashRepository = new BcryptHashService(),
    tokenService: ITokenService = new JwtTokenService(),
    userRepository: IUserRepository = new UserRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
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
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.createBarbershopUseCase.execute(
        {
          name: req.body.name,
          slug: req.body.slug,
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

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.authenticateBarbershopUseCase.execute({
        email: req.body.email,
        password: req.body.password,
      });

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
}

function toBarbershopOutput(barbershop: Barbershop): BarbershopOutputDTO {
  return {
    id: barbershop.id,
    name: barbershop.name,
    slug: barbershop.slug,
    email: barbershop.email,
    phone: barbershop.phone,
    isActive: barbershop.isActive,
  };
}
