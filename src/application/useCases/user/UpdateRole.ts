import { GlobalUserRole } from '@/domain/entities/User';
import IUserRepository from '@/domain/repository/UserRepository';

export default class UpdateUserRoleUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string, globalRole: GlobalUserRole): Promise<GlobalUserRole> {
    if (!id || id.trim() === '') {
      throw new Error('ID do usuário é obrigatório');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('ID do usuário é inválido');
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    user.globalRole = globalRole;
    await this.userRepository.save(user);

    return user.globalRole;
  }
}
