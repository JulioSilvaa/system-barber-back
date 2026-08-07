import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Barbershop Status HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  async function createBarbershop(app: ReturnType<typeof createApp>) {
    const response = await request(app).post('/api/barbershops').send({
      name: 'Barbearia Central',
      slug: 'barbearia-central',
      email: 'contato@barbeariacentral.com',
      phone: '+5516999999999',
      password: 'SenhaForte1',
    });

    expect(response.status).toBe(201);
    const barbershop = response.body as { id: string };

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: 'contato@barbeariacentral.com', password: 'SenhaForte1' });

    expect(login.status).toBe(200);

    return { barbershop, barbershopToken: login.body.accessToken as string };
  }

  describe('PATCH /api/barbershops/:id/status', () => {
    it('deve permitir apenas a própria barbearia alterar o status', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      const denied = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/status`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: 'outra-barbearia', actor: 'BARBERSHOP' }, '30m')}`,
        )
        .send({ isActive: false });

      expect(denied.status).toBe(403);

      const allowed = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/status`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ isActive: false });

      expect(allowed.status).toBe(200);
      expect(allowed.body.isActive).toBe(false);
    });

    it('deve retornar 403 para um usuário comum', async () => {
      const app = createApp();
      const { barbershop } = await createBarbershop(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/status`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: 'user-1', actor: 'USER' }, '30m')}`,
        )
        .send({ isActive: false });

      expect(response.status).toBe(403);
    });

    it('deve retornar 401 sem token', async () => {
      const app = createApp();
      const { barbershop } = await createBarbershop(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/status`)
        .send({ isActive: false });

      expect(response.status).toBe(401);
    });
  });

  describe('Bloqueio de barbearia inativa', () => {
    it('deve bloquear rotas públicas com 404', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/status`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ isActive: false });

      const response = await request(app).get('/api/barbershops/barbearia-central/barbers');

      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Barbearia inativa' }));
    });

    it('deve bloquear rotas protegidas com 403', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/status`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ isActive: false });

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ name: 'Corte', priceCents: 3000, durationMinutes: 30 });

      expect(response.status).toBe(403);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Barbearia inativa' }));
    });

    it('deve bloquear o login da barbearia', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/status`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ isActive: false });

      const response = await request(app)
        .post('/api/barbershops/login')
        .send({ email: 'contato@barbeariacentral.com', password: 'SenhaForte1' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Barbearia inativa' }));
    });
  });
});
