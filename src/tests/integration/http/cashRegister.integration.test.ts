import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';

describe('Cash Register HTTP Integration', () => {
  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  async function createBarbershop(app: Application, identifier: string, name: string) {
    const unique = `${identifier}-${Date.now().toString(36)}`;
    const response = await request(app)
      .post('/api/barbershops')
      .send({
        name,
        email: `${unique}@example.com`,
        phone: '+5516999999999',
        password: 'SenhaForte1',
      });

    expect(response.status).toBe(201);
    const id = (response.body as { id: string }).id;

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: `${unique}@example.com`, password: 'SenhaForte1' });

    expect(login.status).toBe(200);

    return {
      id,
      token: login.body.accessToken as string,
    };
  }

  it('abre, movimenta e fecha o caixa do dia', async () => {
    const app = createApp();
    const barbershop = await createBarbershop(app, 'caixa', 'Caixa Barbershop');

    const opened = await request(app)
      .post(`/api/barbershops/${barbershop.id}/cash-register/open`)
      .set('Authorization', `Bearer ${barbershop.token}`)
      .send({ openingAmountCents: 5000 });

    expect(opened.status).toBe(201);
    expect(opened.body).toEqual(
      expect.objectContaining({ status: 'OPEN', openingAmountCents: 5000 }),
    );

    const again = await request(app)
      .post(`/api/barbershops/${barbershop.id}/cash-register/open`)
      .set('Authorization', `Bearer ${barbershop.token}`)
      .send({});

    expect(again.status).toBe(400);
    expect(again.body.code).toBe('CASH_REGISTER_ALREADY_OPEN');

    const movement = await request(app)
      .post(`/api/barbershops/${barbershop.id}/cash-register/movements`)
      .set('Authorization', `Bearer ${barbershop.token}`)
      .send({ kind: 'EXIT', category: 'EXPENSE', amountCents: 2000, description: 'Café' });

    expect(movement.status).toBe(201);

    const overview = await request(app)
      .get(`/api/barbershops/${barbershop.id}/cash-register`)
      .set('Authorization', `Bearer ${barbershop.token}`);

    expect(overview.status).toBe(200);
    expect(overview.body.open).toEqual(
      expect.objectContaining({
        status: 'OPEN',
        totals: expect.objectContaining({
          expectedAmountCents: 3000,
          entriesCents: 0,
          exitsCents: 2000,
        }),
      }),
    );
    expect(overview.body.open.movements).toHaveLength(1);

    const closed = await request(app)
      .post(`/api/barbershops/${barbershop.id}/cash-register/close`)
      .set('Authorization', `Bearer ${barbershop.token}`)
      .send({ closingAmountCents: 3000 });

    expect(closed.status).toBe(200);
    expect(closed.body).toEqual(
      expect.objectContaining({
        status: 'CLOSED',
        expectedAmountCents: 3000,
        differenceCents: 0,
      }),
    );

    const closedAgain = await request(app)
      .post(`/api/barbershops/${barbershop.id}/cash-register/close`)
      .set('Authorization', `Bearer ${barbershop.token}`)
      .send({ registerId: closed.body.id, closingAmountCents: 0 });

    expect(closedAgain.status).toBe(400);
    expect(closedAgain.body.code).toBe('CASH_REGISTER_ALREADY_CLOSED');
  });

  it('retorna open null quando não há caixa aberto', async () => {
    const app = createApp();
    const barbershop = await createBarbershop(app, 'caixa-vazio', 'Caixa Vazio');

    const response = await request(app)
      .get(`/api/barbershops/${barbershop.id}/cash-register`)
      .set('Authorization', `Bearer ${barbershop.token}`);

    expect(response.status).toBe(200);
    expect(response.body.open).toBeNull();
  });

  it('rejeita requisição sem autenticação', async () => {
    const app = createApp();
    const response = await request(app).post('/api/barbershops/qualquer/cash-register/open');

    expect(response.status).toBe(401);
  });
});
