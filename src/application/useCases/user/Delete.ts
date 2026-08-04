import UserRepository from '@/domain/repository/UserRepository';

export default class DeleteUserUseCase {
  private readonly _userRepository: UserRepository;
  constructor(private readonly userRepository: UserRepository) {
    this._userRepository = userRepository;
  }

  async execute(id: string): Promise<void> {
    if (!id || id.trim() === '') throw new Error('ID do usuário é obrigatório');

    const trimmedId = id.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedId)) {
      throw new Error('ID do usuário inválido');
    }

    const user = await this._userRepository.findById(trimmedId);

    if (!user) throw new Error('Usuário não encontrado');

    await this._userRepository.delete(trimmedId);
  }
}
