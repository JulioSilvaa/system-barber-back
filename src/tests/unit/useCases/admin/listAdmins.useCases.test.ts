import { describe, expect, it } from 'vitest';
import ListAdminsUseCase from '@/application/useCases/admin/ListAdmins';
import { Admin } from '@/domain/entities';
import AdminRepositoryMemory from '@/infra/repositories/inMemory/admin/adminRepositoryMemory';

describe('ListAdminsUseCase', () => {
  it('deve listar todos os admins cadastrados', async () => {
    const adminRepository = new AdminRepositoryMemory();
    await adminRepository.save(
      new Admin({
        id: 'admin-1',
        name: 'Admin Plataforma',
        email: 'admin@exemplo.com',
        password: 'SenhaForte123',
      }),
    );
    await adminRepository.save(
      new Admin({
        id: 'admin-2',
        name: 'Admin Suporte',
        email: 'suporte@exemplo.com',
        password: 'SenhaForte456',
      }),
    );

    const useCase = new ListAdminsUseCase(adminRepository);
    const admins = await useCase.execute();

    expect(admins).toHaveLength(2);
    expect(admins.map(admin => admin.email)).toEqual(['admin@exemplo.com', 'suporte@exemplo.com']);
  });

  it('deve retornar lista vazia quando não há admins', async () => {
    const useCase = new ListAdminsUseCase(new AdminRepositoryMemory());
    const admins = await useCase.execute();

    expect(admins).toEqual([]);
  });
});
