import { beforeEach, describe, expect, it } from 'vitest';
import SetCustomerVipUseCase from '@/application/useCases/customer/SetCustomerVip';
import AuditService from '@/application/services/AuditService';
import { Barbershop } from '@/domain/entities/Barbershop';
import { Customer } from '@/domain/entities/Customer';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';

describe('SetCustomerVipUseCase Unit Tests', () => {
  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const CUSTOMER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  let customerRepository: CustomerRepositoryMemory;
  let auditRepository: AuditRepositoryMemory;
  let useCase: SetCustomerVipUseCase;

  beforeEach(async () => {
    customerRepository = new CustomerRepositoryMemory();
    auditRepository = new AuditRepositoryMemory();
    useCase = new SetCustomerVipUseCase(customerRepository, new AuditService(auditRepository));

    const barbershopRepository = new BarbershopRepositoryMemory();
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

    await customerRepository.save(
      new Customer({
        id: CUSTOMER_ID,
        barbershopId: BARBERSHOP_ID,
        name: 'Maria Souza',
        phone: '16988888888',
      }),
    );
  });

  it('deve marcar o cliente como VIP e registrar auditoria', async () => {
    const result = await useCase.execute(
      { customerId: CUSTOMER_ID, barbershopId: BARBERSHOP_ID, vip: true },
      { actorId: 'owner-1', actorType: 'USER', actorRole: 'OWNER' },
    );

    expect(result.vip).toBe(true);

    const auditLogs = auditRepository.list();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toEqual(
      expect.objectContaining({
        actorId: 'owner-1',
        action: 'VIP_CHANGE',
        entityType: 'CUSTOMER',
        entityId: CUSTOMER_ID,
        before: { vip: false },
        after: { vip: true },
      }),
    );
  });

  it('deve remover o VIP de um cliente marcado', async () => {
    await useCase.execute({ customerId: CUSTOMER_ID, barbershopId: BARBERSHOP_ID, vip: true });

    const result = await useCase.execute({
      customerId: CUSTOMER_ID,
      barbershopId: BARBERSHOP_ID,
      vip: false,
    });

    expect(result.vip).toBe(false);
  });

  it('não deve registrar auditoria quando o VIP não muda', async () => {
    await useCase.execute({ customerId: CUSTOMER_ID, barbershopId: BARBERSHOP_ID, vip: false });

    expect(auditRepository.list()).toHaveLength(0);
  });

  it('deve lançar erro quando o cliente não existe', async () => {
    await expect(
      useCase.execute({
        customerId: 'inexistente',
        barbershopId: BARBERSHOP_ID,
        vip: true,
      }),
    ).rejects.toThrow('Cliente não encontrado');
  });
});
