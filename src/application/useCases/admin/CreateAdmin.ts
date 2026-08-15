import { ValidationError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Admin } from '@/domain/entities';
import IAdminRepository from '@/domain/repository/AdminRepository';
import HashRepository from '@/domain/repository/HashRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import CryptoUuidGenerator from '@/infra/helpers/IdGenerator';

export type CreateAdminInputDTO = {
  name: string;
  email: string;
  password: string;
};

export type CreateAdminOutputDTO = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

export default class CreateAdminUseCase {
  private readonly adminRepository: IAdminRepository;
  private readonly hashRepository: HashRepository;
  private readonly idGenerator: IdGeneratorRepository;

  constructor(
    adminRepository: IAdminRepository,
    hashRepository: HashRepository = new BcryptHashService(),
    idGenerator: IdGeneratorRepository = new CryptoUuidGenerator(),
    private readonly auditService?: AuditService,
  ) {
    this.adminRepository = adminRepository;
    this.hashRepository = hashRepository;
    this.idGenerator = idGenerator;
  }

  async execute(
    input: CreateAdminInputDTO,
    auditCtx?: AuditContext,
  ): Promise<CreateAdminOutputDTO> {
    if (!input.name?.trim()) {
      throw new ValidationError('Nome é obrigatório');
    }

    if (!input.email?.trim()) {
      throw new ValidationError('Email é obrigatório');
    }

    Admin.validatePassword(input.password);

    const existing = await this.adminRepository.findByEmail(input.email);
    if (existing) {
      throw new ValidationError('Email já cadastrado');
    }

    const hashedPassword = await this.hashRepository.hash(input.password);
    const admin = Admin.create({
      id: this.idGenerator.generate(),
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    await this.adminRepository.save(admin);

    await this.auditService?.record({
      ...auditCtx,
      action: 'CREATE',
      entityType: 'ADMIN',
      entityId: admin.id,
      after: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    });

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      isActive: admin.isActive,
    };
  }
}
