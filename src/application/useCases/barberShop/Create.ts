import AuditService, { AuditContext } from '@/application/services/AuditService';
import { generateUniqueSlug } from '@/application/services/SlugService';
import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import HashRepository from '@/domain/repository/HashRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import BcryptHashService from '@/infra/helpers/BcryptHash';

export type CreateBarberShopInputDTO = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export default class CreateBarberShopUseCase {
  private readonly _barbershopRepository: IBarbershopRepository;
  private readonly _idGenerator: IdGeneratorRepository;
  private readonly _hashRepository: HashRepository;

  constructor(
    barbershopRepository: IBarbershopRepository,
    idGenerator: IdGeneratorRepository,
    hashRepository?: HashRepository,
    private readonly auditService?: AuditService,
  ) {
    this._barbershopRepository = barbershopRepository;
    this._idGenerator = idGenerator;
    this._hashRepository = hashRepository ?? new BcryptHashService();
  }

  async execute(input: CreateBarberShopInputDTO, auditCtx?: AuditContext): Promise<Barbershop> {
    this.validateInput(input);
    this.validatePasswordStrength(input.password);

    const slug = await generateUniqueSlug(input.name, candidate =>
      this._barbershopRepository.findBySlug(candidate).then(found => found !== null),
    );

    const existingByEmail = await this._barbershopRepository.findByEmail(input.email);
    if (existingByEmail) {
      throw new Error('Email já em uso');
    }

    const hashedPassword = await this._hashRepository.hash(input.password);
    const barbershop = new Barbershop({
      id: this._idGenerator.generate(),
      name: input.name,
      slug,
      email: input.email,
      phone: input.phone,
      password: hashedPassword,
    });

    await this._barbershopRepository.save(barbershop);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: barbershop.id,
      action: 'CREATE',
      entityType: 'BARBERSHOP',
      entityId: barbershop.id,
      after: {
        id: barbershop.id,
        name: barbershop.name,
        slug: barbershop.slug,
        email: barbershop.email,
        isActive: barbershop.isActive,
      },
    });

    return barbershop;
  }

  private validateInput(input: CreateBarberShopInputDTO): void {
    if (!input.name || input.name.trim() === '') {
      throw new Error('Nome é obrigatório');
    }

    if (!input.email || input.email.trim() === '') {
      throw new Error('Email é obrigatório');
    }

    if (!input.password || input.password.trim() === '') {
      throw new Error('Senha é obrigatória');
    }
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8 || password.length > 72) {
      throw new Error('Senha deve ter entre 8 e 72 caracteres');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new Error(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    }
  }
}
