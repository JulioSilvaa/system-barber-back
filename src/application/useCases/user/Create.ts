import { CreateUserInputDTO, CreateUserOutputDTO } from '@/application/dtos/UserDto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import User from '@/domain/entities/User';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import CryptoUuidGenerator from '@/infra/helpers/IdGenerator';

export default class CreateUserUseCase {
  private readonly _userRepository: IUserRepository;
  private readonly _idGenerator: IdGeneratorRepository;

  constructor(
    userRepository: IUserRepository,
    idGenerator: IdGeneratorRepository = new CryptoUuidGenerator(),
    private readonly auditService?: AuditService,
  ) {
    this._userRepository = userRepository;
    this._idGenerator = idGenerator;
  }

  async execute(input: CreateUserInputDTO, auditCtx?: AuditContext): Promise<CreateUserOutputDTO> {
    this.validateInput(input);

    const existingUser = await this._userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    const user = this.createUser(input);

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

  private createUser(input: CreateUserInputDTO): User {
    const userId = this._idGenerator.generate();

    return User.create({
      id: userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
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
