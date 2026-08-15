import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import { getAccessToken } from '@/tests/helpers/auth';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Customer HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  async function createBarbershop(app: Application, slug: string, name: string) {
    const response = await request(app)
      .post('/api/barbershops')
      .send({
        name,
        slug,
        email: `${slug}@example.com`,
        phone: '+5516999999999',
        password: 'SenhaForte1',
      });

    expect(response.status).toBe(201);
    const id = (response.body as { id: string }).id;

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: `${slug}@example.com`, password: 'SenhaForte1' });

    expect(login.status).toBe(200);

    return {
      id,
      token: getAccessToken(login),
    };
  }

  describe('POST /api/barbershops/:barbershopId/customers', () => {
    it('deve criar um cliente na própria barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/customers`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ name: 'Maria Souza', phone: '16988888888' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          barbershopId: barbershop.id,
          name: 'Maria Souza',
          phone: '16988888888',
          isActive: true,
        }),
      );
    });

    it('deve retornar 401 quando não há token', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/customers`)
        .send({ name: 'Maria Souza', phone: '16988888888' });

      expect(response.status).toBe(401);
    });

    it('deve retornar 403 quando outra barbearia tenta criar cliente', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/customers`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: 'outra-barbearia', actor: 'BARBERSHOP' }, '30m')}`,
        )
        .send({ name: 'Maria Souza', phone: '16988888888' });

      expect(response.status).toBe(403);
    });

    it('deve retornar 403 quando o usuário não tem vínculo com a barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/customers`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: 'intruso-1', actor: 'USER' }, '30m')}`,
        )
        .send({ name: 'Maria Souza', phone: '16988888888' });

      expect(response.status).toBe(403);
    });

    it('deve retornar 400 quando o telefone já está cadastrado na barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const payload = { name: 'Maria Souza', phone: '16988888888' };

      const first = await request(app)
        .post(`/api/barbershops/${barbershop.id}/customers`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(payload);

      expect(first.status).toBe(201);

      const second = await request(app)
        .post(`/api/barbershops/${barbershop.id}/customers`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(payload);

      expect(second.status).toBe(400);
      expect(second.body).toEqual(expect.objectContaining({ message: 'Cliente já cadastrado' }));
    });
  });

  describe('GET /api/barbershops/:barbershopId/customers', () => {
    it('deve listar os clientes da barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/customers`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ name: 'Maria Souza', phone: '16988888888' });

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/customers`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(expect.objectContaining({ name: 'Maria Souza' }));
    });

    it('deve retornar 401 sem token', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app).get(`/api/barbershops/${barbershop.id}/customers`);

      expect(response.status).toBe(401);
    });
  });
});
