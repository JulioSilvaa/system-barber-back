import { CreateUserOutputDTO } from '@/application/dtos/UserDto';
import UserRepository from '@/domain/repository/UserRepository';

export default class FindUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<CreateUserOutputDTO | null> {
    if (!id || id.trim() === '') throw new Error('ID do usuário é obrigatório');

    const trimmedId = id.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedId)) {
      throw new Error('ID do usuário é inválido');
    }

    const user = await this.userRepository.findById(trimmedId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      globalRole: user.globalRole,
      isActive: user.isActive,
    };
  }
}
