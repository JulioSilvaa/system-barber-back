import { beforeEach, describe, expect, it } from 'vitest';
import UpdateBarbershopStatusUseCase from '@/application/useCases/barberShop/UpdateBarbershopStatus';
import AuditService from '@/application/services/AuditService';
import { Barbershop } from '@/domain/entities/Barbershop';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';

describe('UpdateBarbershopStatusUseCase Unit Tests', () => {
  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  let barbershopRepository: BarbershopRepositoryMemory;
  let auditRepository: AuditRepositoryMemory;
  let useCase: UpdateBarbershopStatusUseCase;

  beforeEach(async () => {
    barbershopRepository = new BarbershopRepositoryMemory();
    auditRepository = new AuditRepositoryMemory();
    useCase = new UpdateBarbershopStatusUseCase(
      barbershopRepository,
      new AuditService(auditRepository),
    );

    await barbershopRepository.save(
      new Barbershop({
        id: BARBERSHOP_ID,
        name: 'Barbearia Central',
        slug: 'barbearia-central',
        email: 'contato@barbeariacentral.com',
        phone: '+5516999999999',
        password: 'SenhaForte1',
      }),
    );
  });

  it('deve desativar uma barbearia ativa e registrar auditoria', async () => {
    const result = await useCase.execute(
      { barbershopId: BARBERSHOP_ID, isActive: false },
      { actorId: 'super-admin-1', actorType: 'USER', actorRole: 'SUPER_ADMIN' },
    );

    expect(result.isActive).toBe(false);

    const auditLogs = auditRepository.list();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toEqual(
      expect.objectContaining({
        actorId: 'super-admin-1',
        actorType: 'USER',
        action: 'STATUS_CHANGE',
        entityType: 'BARBERSHOP',
        entityId: BARBERSHOP_ID,
        before: { isActive: true },
        after: { isActive: false },
      }),
    );
  });

  it('deve reativar uma barbearia inativa', async () => {
    await useCase.execute({ barbershopId: BARBERSHOP_ID, isActive: false });

    const result = await useCase.execute({ barbershopId: BARBERSHOP_ID, isActive: true });

    expect(result.isActive).toBe(true);
  });

  it('não deve registrar auditoria quando o status não muda', async () => {
    await useCase.execute({ barbershopId: BARBERSHOP_ID, isActive: true });

    expect(auditRepository.list()).toHaveLength(0);
  });

  it('deve lançar erro quando a barbearia não existe', async () => {
    await expect(useCase.execute({ barbershopId: 'inexistente', isActive: false })).rejects.toThrow(
      'Barbearia não encontrada',
    );
  });
});
