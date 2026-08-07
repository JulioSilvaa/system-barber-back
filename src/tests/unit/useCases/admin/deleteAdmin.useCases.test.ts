import { beforeEach, describe, expect, it } from 'vitest';
import DeleteAdminUseCase from '@/application/useCases/admin/DeleteAdmin';
import AuditService from '@/application/services/AuditService';
import { Admin } from '@/domain/entities';
import AdminRepositoryMemory from '@/infra/repositories/inMemory/admin/adminRepositoryMemory';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';

describe('DeleteAdminUseCase', () => {
  let adminRepository: AdminRepositoryMemory;
  let auditRepository: AuditRepositoryMemory;
  let useCase: DeleteAdminUseCase;

  beforeEach(async () => {
    adminRepository = new AdminRepositoryMemory();
    auditRepository = new AuditRepositoryMemory();
    useCase = new DeleteAdminUseCase(adminRepository, new AuditService(auditRepository));

    await adminRepository.save(
      new Admin({
        id: 'admin-1',
        name: 'Admin Plataforma',
        email: 'admin@exemplo.com',
        password: 'SenhaForte123',
      }),
    );
  });

  it('deve excluir outro admin e registrar auditoria', async () => {
    await adminRepository.save(
      new Admin({
        id: 'admin-2',
        name: 'Admin Suporte',
        email: 'suporte@exemplo.com',
        password: 'SenhaForte456',
      }),
    );

    await useCase.execute('admin-2', {
      actorId: 'admin-1',
      actorType: 'ADMIN',
      actorRole: 'ADMIN',
    });

    expect(await adminRepository.findById('admin-2')).toBeNull();

    const auditLogs = auditRepository.list();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toEqual(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'DELETE',
        entityType: 'ADMIN',
        entityId: 'admin-2',
      }),
    );
  });

  it('deve impedir o admin de excluir a si mesmo', async () => {
    await expect(
      useCase.execute('admin-1', { actorId: 'admin-1', actorType: 'ADMIN', actorRole: 'ADMIN' }),
    ).rejects.toThrow('Não é possível excluir o próprio admin');
  });

  it('deve lançar erro quando o admin não existe', async () => {
    await expect(
      useCase.execute('admin-inexistente', {
        actorId: 'admin-1',
        actorType: 'ADMIN',
        actorRole: 'ADMIN',
      }),
    ).rejects.toThrow('Admin não encontrado');
  });

  it('deve exigir um ID', async () => {
    await expect(
      useCase.execute('', { actorId: 'admin-1', actorType: 'ADMIN', actorRole: 'ADMIN' }),
    ).rejects.toThrow('ID do admin é obrigatório');
  });
});
