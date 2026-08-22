import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProcessAsaasWebhookUseCase from '@/application/useCases/billing/ProcessAsaasWebhook';

describe('ProcessAsaasWebhookUseCase', () => {
  const REMOTE_SUBSCRIPTION_ID = 'sub_remote_1';
  const SUBSCRIPTION_ROW = {
    id: 'sub-1',
    barbershopId: 'barbershop-1',
    plan: 'PRO',
    status: 'TRIAL',
    mrrCents: 0,
    provider: 'ASAAS',
    providerCustomerId: 'cus_1',
    providerSubscriptionId: REMOTE_SUBSCRIPTION_ID,
  };

  let updateMock: ReturnType<typeof vi.fn>;
  let findFirstMock: ReturnType<typeof vi.fn>;
  let useCase: ProcessAsaasWebhookUseCase;

  function buildPrisma() {
    updateMock = vi.fn().mockResolvedValue({});
    findFirstMock = vi.fn().mockResolvedValue({ ...SUBSCRIPTION_ROW });
    return {
      subscription: { findFirst: findFirstMock, update: updateMock },
    };
  }

  beforeEach(() => {
    process.env.PLAN_PRICE_PRO = '199.90';
    process.env.PLAN_PRICE_BASIC = '99.90';
    useCase = new ProcessAsaasWebhookUseCase(buildPrisma() as never);
  });

  it('deve ativar a assinatura em PAYMENT_RECEIVED renovando o período', async () => {
    const output = await useCase.execute({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_1', subscription: REMOTE_SUBSCRIPTION_ID, nextDueDate: '2026-09-21' },
    });

    expect(output.processed).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        mrrCents: 19990,
        currentPeriodEnd: new Date('2026-09-21T12:00:00Z'),
      }),
    });
  });

  it('deve ativar a assinatura em PAYMENT_CONFIRMED', async () => {
    const output = await useCase.execute({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_2', subscription: REMOTE_SUBSCRIPTION_ID },
    });

    expect(output.processed).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({ status: 'ACTIVE' }),
    });
  });

  it('deve marcar PAST_DUE em PAYMENT_OVERDUE', async () => {
    const output = await useCase.execute({
      event: 'PAYMENT_OVERDUE',
      payment: { id: 'pay_3', subscription: REMOTE_SUBSCRIPTION_ID },
    });

    expect(output.processed).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'PAST_DUE' },
    });
  });

  it('deve cancelar em PAYMENT_REFUNDED zerando o MRR', async () => {
    const output = await useCase.execute({
      event: 'PAYMENT_REFUNDED',
      payment: { id: 'pay_4', subscription: REMOTE_SUBSCRIPTION_ID },
    });

    expect(output.processed).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'CANCELED', mrrCents: 0 },
    });
  });

  it('deve ignorar eventos desconhecidos sem tocar no banco', async () => {
    const output = await useCase.execute({
      event: 'PAYMENT_CREATED',
      payment: { id: 'pay_5', subscription: REMOTE_SUBSCRIPTION_ID },
    });

    expect(output.processed).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('deve ignorar pagamentos sem assinatura vinculada', async () => {
    const output = await useCase.execute({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_6', subscription: null },
    });

    expect(output.processed).toBe(false);
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('deve ignorar quando a assinatura não existe localmente', async () => {
    findFirstMock.mockResolvedValue(null);

    const output = await useCase.execute({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_7', subscription: 'sub_inexistente' },
    });

    expect(output.processed).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
