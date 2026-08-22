import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscribeBarbershopUseCase from '@/application/useCases/billing/SubscribeBarbershop';
import type { AsaasGateway } from '@/application/useCases/billing/SubscribeBarbershop';

describe('SubscribeBarbershopUseCase', () => {
  const BARBERSHOP_ID = 'barbershop-1';

  type SubscriptionRow = Record<string, unknown>;

  let barbershopFindUnique: ReturnType<typeof vi.fn>;
  let subscriptionFindUnique: ReturnType<typeof vi.fn>;
  let subscriptionCreate: ReturnType<typeof vi.fn>;
  let subscriptionUpdate: ReturnType<typeof vi.fn>;
  let prisma: Record<string, unknown>;
  let gateway: {
    createCustomer: ReturnType<typeof vi.fn>;
    createSubscription: ReturnType<typeof vi.fn>;
  };

  function buildSubscriptionRow(overrides: SubscriptionRow = {}): SubscriptionRow {
    return {
      id: 'sub-1',
      barbershopId: BARBERSHOP_ID,
      plan: 'BASIC',
      status: 'TRIAL',
      mrrCents: 0,
      provider: 'MANUAL',
      providerCustomerId: null,
      providerSubscriptionId: null,
      billingType: null,
      billingCycleDay: null,
      trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      ...overrides,
    };
  }

  function buildPrisma(subscription: SubscriptionRow | null) {
    barbershopFindUnique = vi.fn().mockResolvedValue({
      id: BARBERSHOP_ID,
      name: 'Barbearia Teste',
      email: 'contato@barbearia.com',
      isActive: true,
    });
    subscriptionFindUnique = vi.fn().mockResolvedValue(subscription);
    subscriptionCreate = vi
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'sub-new', ...data }));
    subscriptionUpdate = vi.fn().mockResolvedValue({});
    prisma = {
      barbershop: { findUnique: barbershopFindUnique },
      subscription: {
        findUnique: subscriptionFindUnique,
        create: subscriptionCreate,
        update: subscriptionUpdate,
      },
      featureFlag: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
    };
  }

  function buildGateway(): AsaasGateway {
    gateway = {
      createCustomer: vi.fn().mockResolvedValue({ id: 'cus_1' }),
      createSubscription: vi
        .fn()
        .mockResolvedValue({ id: 'sub_remote_9', nextDueDate: '2026-09-06' }),
    };
    return gateway as unknown as AsaasGateway;
  }

  beforeEach(() => {
    process.env.PLAN_PRICE_BASIC = '99.90';
    process.env.PLAN_PRICE_PRO = '199.90';
  });

  it('deve criar customer e assinatura remota quando ainda não possui', async () => {
    buildPrisma(buildSubscriptionRow());
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    const output = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      plan: 'PRO',
      cpfCnpj: '12.345.678/0001-95',
    });

    expect(gateway.createCustomer).toHaveBeenCalledWith({
      name: 'Barbearia Teste',
      email: 'contato@barbearia.com',
      cpfCnpj: '12345678000195',
    });
    expect(gateway.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        billingType: 'UNDEFINED',
        cycle: 'MONTHLY',
        value: 199.9,
      }),
    );
    expect(output).toEqual(
      expect.objectContaining({
        plan: 'PRO',
        providerSubscriptionId: 'sub_remote_9',
      }),
    );
    expect(subscriptionUpdate).toHaveBeenCalledWith({
      where: { barbershopId: BARBERSHOP_ID },
      data: expect.objectContaining({
        provider: 'ASAAS',
        providerCustomerId: 'cus_1',
        providerSubscriptionId: 'sub_remote_9',
        mrrCents: 19990,
      }),
    });
  });

  it('deve usar o fim do trial como primeira cobrança quando o trial está ativo', async () => {
    const trialEndsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    buildPrisma(buildSubscriptionRow({ trialEndsAt }));
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    await useCase.execute({ barbershopId: BARBERSHOP_ID, plan: 'BASIC', cpfCnpj: '12345678900' });

    expect(gateway.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ nextDueDate: trialEndsAt.toISOString().slice(0, 10) }),
    );
  });

  it('deve cobrar no dia seguinte quando o trial já expirou', async () => {
    buildPrisma(buildSubscriptionRow({ trialEndsAt: new Date(Date.now() - 5 * 86400000) }));
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    await useCase.execute({ barbershopId: BARBERSHOP_ID, plan: 'BASIC', cpfCnpj: '12345678900' });

    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect(gateway.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ nextDueDate: tomorrow }),
    );
  });

  it('deve reutilizar o customer existente do gateway', async () => {
    buildPrisma(buildSubscriptionRow({ provider: 'ASAAS', providerCustomerId: 'cus_existente' }));
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    await useCase.execute({ barbershopId: BARBERSHOP_ID, plan: 'BASIC', cpfCnpj: '12345678900' });

    expect(gateway.createCustomer).not.toHaveBeenCalled();
    expect(gateway.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existente' }),
    );
  });

  it('deve rejeitar plano inválido', async () => {
    buildPrisma(buildSubscriptionRow());
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    await expect(
      useCase.execute({ barbershopId: BARBERSHOP_ID, plan: 'GOLD', cpfCnpj: '12345678900' }),
    ).rejects.toThrow('Plano inválido. Use BASIC ou PRO.');
  });

  it('deve rejeitar CPF/CNPJ inválido', async () => {
    buildPrisma(buildSubscriptionRow());
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    await expect(
      useCase.execute({ barbershopId: BARBERSHOP_ID, plan: 'BASIC', cpfCnpj: '123' }),
    ).rejects.toThrow('CPF/CNPJ inválido');
  });

  it('deve rejeitar assinatura duplicada no gateway', async () => {
    buildPrisma(
      buildSubscriptionRow({
        provider: 'ASAAS',
        providerSubscriptionId: 'sub_ativa',
        status: 'ACTIVE',
      }),
    );
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    await expect(
      useCase.execute({ barbershopId: BARBERSHOP_ID, plan: 'PRO', cpfCnpj: '12345678900' }),
    ).rejects.toThrow('Barbearia já possui assinatura ativa no gateway de pagamento');
  });

  it('deve permitir re-assinar após cancelamento', async () => {
    buildPrisma(
      buildSubscriptionRow({
        provider: 'ASAAS',
        providerSubscriptionId: 'sub_antiga',
        status: 'CANCELED',
      }),
    );
    const useCase = new SubscribeBarbershopUseCase(prisma as never, buildGateway());

    const output = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      plan: 'BASIC',
      cpfCnpj: '12345678900',
    });

    expect(output.providerSubscriptionId).toBe('sub_remote_9');
  });
});
