import { CreateUserInputDTO, CreateUserOutputDTO } from '@/application/dtos/UserDto';
import User from '@/domain/entities/User';
import HashRepository from '@/domain/repository/HashRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import IUserRepository from '@/domain/repository/UserRepository';

export default class CreateUserUseCase {
  constructor(
    private readonly _userRepository: IUserRepository,
    private readonly _hashPassword: HashRepository,
    private readonly _idGenerator: IdGeneratorRepository,
  ) {}

  async execute(input: CreateUserInputDTO): Promise<CreateUserOutputDTO> {
    this.validateInput(input);

    const existingUser = await this._userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    const hashedPassword = await this._hashPassword.hash(input.password ?? '');
    const user = this.createUser(input, hashedPassword);

    await this._userRepository.save(user);

    return this.toOutput(user);
  }

  private validateInput(input: CreateUserInputDTO): void {
    if (!input.email?.trim()) {
      throw new Error('Email é obrigatório');
    }

    if (input.password === undefined) {
      input.password = '';
    }
  }

  private createUser(input: CreateUserInputDTO, hashedPassword: string): User {
    const userId = this._idGenerator.generate();

    return User.create({
      id: userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      barbershopId: input.barbershopId,
      password: hashedPassword,
      role: input.role,
    });
  }

  private toOutput(user: User): CreateUserOutputDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      barbershopId: user.barbershopId,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
