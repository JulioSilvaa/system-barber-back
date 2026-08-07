import AuditService, { AuditContext } from '@/application/services/AuditService';
import UserRepository from '@/domain/repository/UserRepository';

export default class DeleteUserUseCase {
  private readonly _userRepository: UserRepository;
  constructor(
    userRepository: UserRepository,
    private readonly auditService?: AuditService,
  ) {
    this._userRepository = userRepository;
  }

  async execute(id: string, auditCtx?: AuditContext): Promise<void> {
    if (!id || id.trim() === '') throw new Error('ID do usuário é obrigatório');

    const trimmedId = id.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedId)) {
      throw new Error('ID do usuário inválido');
    }

    const user = await this._userRepository.findById(trimmedId);

    if (!user) throw new Error('Usuário não encontrado');

    await this._userRepository.delete(trimmedId);

    await this.auditService?.record({
      ...auditCtx,
      action: 'DELETE',
      entityType: 'USER',
      entityId: user.id,
      before: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }
}
