import User from "@/domain/entities/User";

import IUserRepository from "@/domain/repository/UserRepository";
import IdGeneratorRepository from "@/domain/repository/IdGeneratorRepository";
import HashRepository from "@/domain/repository/HashRepository";
import { CreateUserInputDTO, CreateUserOutputDTO } from "@/application/dtos/UserDto";

export default class CreateUserUseCase {
  constructor(
    private readonly _userRepository: IUserRepository,
    private readonly _hashPassword: HashRepository,
    private readonly _idGenerator: IdGeneratorRepository
  ) { }

  async execute(input: CreateUserInputDTO): Promise<CreateUserOutputDTO> {
    // 1. Validação de regra de negócio (descomentar quando pronto)
    // const existingUser = await this._userRepository.findByEmail(input.email);
    // if (existingUser) {
    //   throw new Error("Email já cadastrado");
    // }

    // 2. Hash da senha antes da criação do domínio
    const hashedPassword = await this._hashPassword.hash(input.password || '');

    // 3. Criação da entidade com dados válidos
    const userId = this._idGenerator.generate();

    const user = User.create({
      id: userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      barbershopId: input.barbershopId,
      password: hashedPassword,
    });

    // 4. Persistência
    await this._userRepository.save(user);
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