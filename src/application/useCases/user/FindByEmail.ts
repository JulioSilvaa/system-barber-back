import { CreateUserOutputDTO } from '@/application/dtos/UserDto';
import UserRepository from '@/domain/repository/UserRepository';

export default class FindUserByEmail {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string): Promise<CreateUserOutputDTO | null> {
    if (!email || email.trim() === '') throw new Error('Email do usuário é obrigatório');
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) throw new Error('Email inválido');

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }
}
