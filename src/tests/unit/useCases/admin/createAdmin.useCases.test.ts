import { beforeEach, describe, expect, it } from 'vitest';
import CreateAdminUseCase from '@/application/useCases/admin/CreateAdmin';
import AuditService from '@/application/services/AuditService';
import AdminRepositoryMemory from '@/infra/repositories/inMemory/admin/adminRepositoryMemory';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import BcryptHashService from '@/infra/helpers/BcryptHash';

describe('CreateAdminUseCase', () => {
  let adminRepository: AdminRepositoryMemory;
  let auditRepository: AuditRepositoryMemory;
  let useCase: CreateAdminUseCase;

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    adminRepository = new AdminRepositoryMemory();
    auditRepository = new AuditRepositoryMemory();
    useCase = new CreateAdminUseCase(
      adminRepository,
      new BcryptHashService(),
      { generate: () => 'admin-2' },
      new AuditService(auditRepository),
    );
  });

  it('deve criar um admin com senha criptografada e registrar auditoria', async () => {
    const output = await useCase.execute(
      { name: 'Admin Suporte', email: 'suporte@exemplo.com', password: 'SenhaForte456' },
      { actorId: 'admin-1', actorType: 'ADMIN', actorRole: 'ADMIN' },
    );

    expect(output).toEqual(
      expect.objectContaining({
        id: 'admin-2',
        name: 'Admin Suporte',
        email: 'suporte@exemplo.com',
        isActive: true,
      }),
    );

    const saved = await adminRepository.findByEmail('suporte@exemplo.com');
    expect(saved).not.toBeNull();
    expect(saved!.password).not.toBe('SenhaForte456');
    expect(await new BcryptHashService().compare('SenhaForte456', saved!.password)).toBe(true);

    const auditLogs = auditRepository.list();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toEqual(
      expect.objectContaining({
        actorId: 'admin-1',
        actorType: 'ADMIN',
        action: 'CREATE',
        entityType: 'ADMIN',
        entityId: 'admin-2',
      }),
    );
  });

  it('deve exigir nome', async () => {
    await expect(
      useCase.execute({ name: '', email: 'x@exemplo.com', password: 'SenhaForte456' }),
    ).rejects.toThrow('Nome é obrigatório');
  });

  it('deve exigir email', async () => {
    await expect(
      useCase.execute({ name: 'Admin', email: '', password: 'SenhaForte456' }),
    ).rejects.toThrow('Email é obrigatório');
  });

  it('deve lançar erro quando o email já está cadastrado', async () => {
    await useCase.execute({
      name: 'Admin',
      email: 'suporte@exemplo.com',
      password: 'SenhaForte456',
    });

    await expect(
      useCase.execute({ name: 'Outro', email: 'suporte@exemplo.com', password: 'SenhaForte456' }),
    ).rejects.toThrow('Email já cadastrado');
  });

  it('deve lançar erro quando a senha é fraca', async () => {
    await expect(
      useCase.execute({ name: 'Admin', email: 'outro@exemplo.com', password: 'fraca' }),
    ).rejects.toThrow('Senha deve ter entre 8 e 72 caracteres');
  });
});
