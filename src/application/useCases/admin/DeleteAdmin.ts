import { ValidationError, NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import IAdminRepository from '@/domain/repository/AdminRepository';

export default class DeleteAdminUseCase {
  constructor(
    private readonly adminRepository: IAdminRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(id: string, auditCtx?: AuditContext): Promise<void> {
    if (!id || id.trim() === '') {
      throw new ValidationError('ID do admin é obrigatório');
    }

    if (auditCtx?.actorId === id) {
      throw new ValidationError('Não é possível excluir o próprio admin');
    }

    const admin = await this.adminRepository.findById(id);
    if (!admin) {
      throw new NotFoundError('Admin não encontrado');
    }

    const allAdmins = await this.adminRepository.list();
    if (allAdmins.length <= 1) {
      throw new ValidationError('Não é possível excluir o último admin');
    }

    await this.adminRepository.delete(id);

    await this.auditService?.record({
      ...auditCtx,
      action: 'DELETE',
      entityType: 'ADMIN',
      entityId: id,
      before: { name: admin.name, email: admin.email },
    });
  }
}
