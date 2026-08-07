import { CreateUserInputDTO, CreateUserOutputDTO } from '@/application/dtos/UserDto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import User from '@/domain/entities/User';
import HashRepository from '@/domain/repository/HashRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import CryptoUuidGenerator from '@/infra/helpers/IdGenerator';

export default class CreateUserUseCase {
  private readonly _userRepository: IUserRepository;
  private readonly _hashRepository: HashRepository;
  private readonly _idGenerator: IdGeneratorRepository;

  constructor(
    userRepository: IUserRepository,
    hashRepository: HashRepository = new BcryptHashService(),
    idGenerator: IdGeneratorRepository = new CryptoUuidGenerator(),
    private readonly auditService?: AuditService,
  ) {
    this._userRepository = userRepository;
    this._hashRepository = hashRepository;
    this._idGenerator = idGenerator;
  }

  async execute(input: CreateUserInputDTO, auditCtx?: AuditContext): Promise<CreateUserOutputDTO> {
    this.validateInput(input);
    this.validatePasswordStrength(input.password);

    const existingUser = await this._userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    const hashedPassword = await this._hashRepository.hash(input.password as string);
    const user = this.createUser(input, hashedPassword);

    await this._userRepository.save(user);

    await this.auditService?.record({
      ...auditCtx,
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id,
      after: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    return this.toOutput(user);
  }

  private validateInput(input: CreateUserInputDTO): void {
    if (!input.name?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    if (!input.email?.trim()) {
      throw new Error('Email é obrigatório');
    }
  }

  private validatePasswordStrength(password?: string): void {
    if (!password || password.length < 8 || password.length > 72) {
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

  private createUser(input: CreateUserInputDTO, hashedPassword: string): User {
    const userId = this._idGenerator.generate();

    return User.create({
      id: userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      password: hashedPassword,
    });
  }

  private toOutput(user: User): CreateUserOutputDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
    };
  }
}
