import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import { getAccessToken } from '@/tests/helpers/auth';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Service HTTP Integration', () => {
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

  function servicePayload() {
    return { name: 'Corte de cabelo', priceCents: 4000, durationMinutes: 30 };
  }

  describe('POST /api/barbershops/:barbershopId/services', () => {
    it('deve criar um serviço na própria barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(servicePayload());

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          barbershopId: barbershop.id,
          name: 'Corte de cabelo',
          priceCents: 4000,
          durationMinutes: 30,
          isActive: true,
        }),
      );
    });

    it('deve retornar 401 quando não há token', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .send(servicePayload());

      expect(response.status).toBe(401);
    });

    it('deve retornar 403 quando o usuário não tem vínculo ativo com a barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: 'intruso-1', actor: 'USER' }, '30m')}`,
        )
        .send(servicePayload());

      expect(response.status).toBe(403);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Acesso negado' }));
    });

    it('deve retornar 403 para outra barbearia', async () => {
      const app = createApp();
      const barbershopA = await createBarbershop(app, 'barbearia-a', 'Barbearia A');
      const barbershopB = await createBarbershop(app, 'barbearia-b', 'Barbearia B');

      const response = await request(app)
        .post(`/api/barbershops/${barbershopA.id}/services`)
        .set('Authorization', `Bearer ${barbershopB.token}`)
        .send(servicePayload());

      expect(response.status).toBe(403);
    });

    it('deve retornar 400 quando o preço é inválido', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ ...servicePayload(), priceCents: 0 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/barbershops/:barbershopId/services', () => {
    it('deve listar os serviços da barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(servicePayload());

      const response = await request(app).get(`/api/barbershops/${barbershop.id}/services`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(expect.objectContaining({ name: 'Corte de cabelo' }));
    });

    it('deve listar os serviços sem autenticação e resolvendo pelo slug', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(servicePayload());

      const response = await request(app).get('/api/barbershops/barbearia-central/services');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('deve retornar 404 quando a barbearia não existe', async () => {
      const app = createApp();

      const response = await request(app).get('/api/barbershops/barbearia-inexistente/services');

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Barbearia não encontrada' }),
      );
    });
  });

  describe('PATCH /api/barbershops/:barbershopId/services/:serviceId', () => {
    it('deve atualizar nome, preço e duração do serviço', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const created = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(servicePayload());

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/services/${created.body.id}`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ name: 'Corte + Barba', priceCents: 6500, durationMinutes: 45 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: created.body.id,
          name: 'Corte + Barba',
          priceCents: 6500,
          durationMinutes: 45,
          isActive: true,
        }),
      );
    });

    it('deve retornar 400 quando o serviço não pertence à barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/services/servico-inexistente`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ name: 'Qualquer' });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/barbershops/:barbershopId/services/:serviceId/status', () => {
    it('deve desativar e reativar um serviço', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const created = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(servicePayload());

      const deactivated = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/services/${created.body.id}/status`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ isActive: false });

      expect(deactivated.status).toBe(200);
      expect(deactivated.body).toEqual(expect.objectContaining({ isActive: false }));

      const reactivated = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/services/${created.body.id}/status`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ isActive: true });

      expect(reactivated.status).toBe(200);
      expect(reactivated.body).toEqual(expect.objectContaining({ isActive: true }));
    });

    it('deve retornar 401 sem token', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/services/qualquer/status`)
        .send({ isActive: false });

      expect(response.status).toBe(401);
    });
  });
});
