import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Service HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  const OWNER_SUB = '123e4567-e89b-41d3-a456-426614174010';

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  function auth(sub: string, globalRole: 'USER' | 'SUPER_ADMIN' = 'USER') {
    return `Bearer ${tokenService.sign({ sub, globalRole }, '30m')}`;
  }

  async function createBarbershop(app: Application, slug: string, name: string) {
    const response = await request(app)
      .post('/api/barbershops')
      .set('Authorization', auth(OWNER_SUB))
      .send({ name, slug, phone: '+5516999999999' });

    expect(response.status).toBe(201);
    return response.body as { id: string };
  }

  function servicePayload() {
    return { name: 'Corte de cabelo', priceCents: 4000, durationMinutes: 30 };
  }

  describe('POST /api/barbershops/:barbershopId/services', () => {
    it('deve criar um serviço na barbearia do usuário com vínculo ativo', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', auth(OWNER_SUB))
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
        .set('Authorization', auth('intruso-1'))
        .send(servicePayload());

      expect(response.status).toBe(403);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Acesso negado' }));
    });

    it('deve retornar 403 para um dono de outra barbearia', async () => {
      const app = createApp();
      const barbershopA = await createBarbershop(app, 'barbearia-a', 'Barbearia A');
      await createBarbershop(app, 'barbearia-b', 'Barbearia B');

      const response = await request(app)
        .post(`/api/barbershops/${barbershopA.id}/services`)
        .set('Authorization', auth('dono-b-1'))
        .send(servicePayload());

      expect(response.status).toBe(403);
    });

    it('deve retornar 400 quando o preço é inválido', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', auth(OWNER_SUB))
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
        .set('Authorization', auth(OWNER_SUB))
        .send(servicePayload());

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', auth(OWNER_SUB));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(expect.objectContaining({ name: 'Corte de cabelo' }));
    });

    it('deve retornar 403 quando o usuário não tem vínculo', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/services`)
        .set('Authorization', auth('intruso-1'));

      expect(response.status).toBe(403);
    });
  });
});
