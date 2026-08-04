import { CreateUserInputDTO, CreateUserOutputDTO } from '@/application/dtos/UserDto';
import User from '@/domain/entities/User';
import HashRepository from '@/domain/repository/HashRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import CryptoUuidGenerator from '@/infra/helpers/IdGenerator';

export default class CreateAdminUserUseCase {
  private readonly _userRepository: IUserRepository;
  private readonly _hashRepository: HashRepository;
  private readonly _idGenerator: IdGeneratorRepository;

  constructor(
    userRepository: IUserRepository,
    hashRepository: HashRepository = new BcryptHashService(),
    idGenerator: IdGeneratorRepository = new CryptoUuidGenerator(),
  ) {
    this._userRepository = userRepository;
    this._hashRepository = hashRepository;
    this._idGenerator = idGenerator;
  }

  async execute(input: CreateUserInputDTO): Promise<CreateUserOutputDTO> {
    this.validateInput(input);

    const existingUser = await this._userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    const hashedPassword = await this._hashRepository.hash(input.password);
    const user = User.create({
      id: this._idGenerator.generate(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      password: hashedPassword,
      globalRole: 'SUPER_ADMIN',
    });

    await this._userRepository.save(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      globalRole: user.globalRole,
      isActive: user.isActive,
    };
  }

  private validateInput(input: CreateUserInputDTO): void {
    if (!input.name?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    if (!input.email?.trim()) {
      throw new Error('Email é obrigatório');
    }
  }
}
