import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Application } from 'express';

const prismaState = vi.hoisted(() => ({
  instance: undefined as unknown,
}));

vi.mock('@/infra/database/prisma', () => ({
  getPrismaClient: () => prismaState.instance,
}));

import { createApp } from '@/infra/http/express/app';
import { createMemoryRepositorySet } from '@/infra/repositories/factory';

describe('Asaas Webhook HTTP Integration', () => {
  const WEBHOOK_SECRET = 'whsec_token_de_teste_32_caracteres_ok';
  const REMOTE_SUBSCRIPTION_ID = 'sub_remote_1';

  let updateMock: ReturnType<typeof vi.fn>;
  let findFirstMock: ReturnType<typeof vi.fn>;

  function buildFakePrisma(subscriptionRow: Record<string, unknown> | null) {
    updateMock = vi.fn().mockResolvedValue({});
    findFirstMock = vi.fn().mockResolvedValue(subscriptionRow);
    return {
      subscription: { findFirst: findFirstMock, update: updateMock },
    };
  }

  beforeEach(() => {
    process.env.ASAAS_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    prismaState.instance = buildFakePrisma({
      id: 'sub-1',
      barbershopId: 'barbershop-1',
      plan: 'PRO',
      status: 'TRIAL',
      mrrCents: 0,
      provider: 'ASAAS',
      providerSubscriptionId: REMOTE_SUBSCRIPTION_ID,
    });
  });

  async function buildApp(): Promise<Application> {
    return createApp({ repositories: createMemoryRepositorySet() });
  }

  it('deve retornar 401 sem o header asaas-access-token', async () => {
    const app = await buildApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .send({ event: 'PAYMENT_RECEIVED', payment: {} });

    expect(response.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('deve retornar 401 com token inválido', async () => {
    const app = await buildApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', 'token_errado')
      .send({ event: 'PAYMENT_RECEIVED', payment: {} });

    expect(response.status).toBe(401);
  });

  it('deve aceitar evento válido e responder 200', async () => {
    const app = await buildApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', WEBHOOK_SECRET)
      .send({
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: 'pay_1',
          subscription: REMOTE_SUBSCRIPTION_ID,
          nextDueDate: '2026-09-21',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { provider: 'ASAAS', providerSubscriptionId: REMOTE_SUBSCRIPTION_ID },
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({ status: 'ACTIVE', mrrCents: 19990 }),
    });
  });

  it('deve responder 200 ignorando eventos sem assinatura vinculada', async () => {
    prismaState.instance = buildFakePrisma(null);
    const app = await buildApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', WEBHOOK_SECRET)
      .send({ event: 'PAYMENT_RECEIVED', payment: { subscription: 'sub_desconhecida' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
