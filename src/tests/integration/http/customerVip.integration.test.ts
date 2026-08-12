import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Customer VIP HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  async function createBarbershopWithCustomer(app: ReturnType<typeof createApp>) {
    const barbershop = await request(app).post('/api/barbershops').send({
      name: 'Barbearia Central',
      slug: 'barbearia-central',
      email: 'contato@barbeariacentral.com',
      phone: '+5516999999999',
      password: 'SenhaForte1',
    });

    expect(barbershop.status).toBe(201);
    const barbershopId = barbershop.body.id as string;

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: 'contato@barbeariacentral.com', password: 'SenhaForte1' });

    expect(login.status).toBe(200);
    const barbershopToken = login.body.accessToken as string;

    const customer = await request(app)
      .post(`/api/barbershops/${barbershopId}/customers`)
      .set('Authorization', `Bearer ${barbershopToken}`)
      .send({ name: 'Maria Souza', phone: '16988888888' });

    expect(customer.status).toBe(201);

    return {
      barbershopId,
      barbershopToken,
      customerId: customer.body.id as string,
    };
  }

  describe('PATCH /api/barbershops/:barbershopId/customers/:id/vip', () => {
    it('deve permitir a própria barbearia marcar o cliente como VIP', async () => {
      const app = createApp();
      const { barbershopId, barbershopToken, customerId } = await createBarbershopWithCustomer(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershopId}/customers/${customerId}/vip`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ vip: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ id: customerId, vip: true }));
    });

    it('deve permitir a própria barbearia remover o VIP', async () => {
      const app = createApp();
      const { barbershopId, barbershopToken, customerId } = await createBarbershopWithCustomer(app);

      await request(app)
        .patch(`/api/barbershops/${barbershopId}/customers/${customerId}/vip`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ vip: true });

      const response = await request(app)
        .patch(`/api/barbershops/${barbershopId}/customers/${customerId}/vip`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ vip: false });

      expect(response.status).toBe(200);
      expect(response.body.vip).toBe(false);
    });

    it('deve negar barbeiro sem papel OWNER', async () => {
      const app = createApp();
      const { barbershopId, barbershopToken, customerId } = await createBarbershopWithCustomer(app);

      const barber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({
          name: 'Barbeiro João',
          email: 'barbeiro@example.com',
          phone: '11988888888',
          barbershopId,
        });

      expect(barber.status).toBe(201);
      const barberId = barber.body.id as string;

      const response = await request(app)
        .patch(`/api/barbershops/${barbershopId}/customers/${customerId}/vip`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: barberId, actor: 'USER' }, '30m')}`,
        )
        .send({ vip: true });

      expect(response.status).toBe(403);
    });

    it('deve retornar 401 sem token', async () => {
      const app = createApp();
      const { barbershopId, customerId } = await createBarbershopWithCustomer(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershopId}/customers/${customerId}/vip`)
        .send({ vip: true });

      expect(response.status).toBe(401);
    });
  });
});
