import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Barbershop HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  function auth(sub: string, globalRole: 'USER' | 'SUPER_ADMIN' = 'USER') {
    return `Bearer ${tokenService.sign({ sub, globalRole }, '30m')}`;
  }

  describe('POST /api/barbershops', () => {
    it('deve criar uma barbearia e tornar o criador o OWNER dela', async () => {
      const app = createApp();
      const ownerSub = '123e4567-e89b-41d3-a456-426614174000';

      const response = await request(app)
        .post('/api/barbershops')
        .set('Authorization', auth(ownerSub))
        .send({ name: 'Barbearia Central', slug: 'barbearia-central', phone: '+5516999999999' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          name: 'Barbearia Central',
          slug: 'barbearia-central',
          isActive: true,
        }),
      );

      const membershipsResponse = await request(app)
        .get('/api/memberships')
        .set('Authorization', auth(ownerSub));

      expect(membershipsResponse.status).toBe(200);
      expect(membershipsResponse.body).toEqual([
        expect.objectContaining({
          barbershopId: response.body.id,
          status: 'ACTIVE',
          localRole: 'OWNER',
        }),
      ]);
    });

    it('deve retornar 401 quando não há token', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/api/barbershops')
        .send({ name: 'Barbearia Central', slug: 'barbearia-central', phone: '+5516999999999' });

      expect(response.status).toBe(401);
    });

    it('deve retornar 400 quando o slug já está em uso', async () => {
      const app = createApp();

      const payload = {
        name: 'Barbearia Central',
        slug: 'barbearia-central',
        phone: '+5516999999999',
      };

      await request(app)
        .post('/api/barbershops')
        .set('Authorization', auth('owner-1'))
        .send(payload);

      const response = await request(app)
        .post('/api/barbershops')
        .set('Authorization', auth('owner-2'))
        .send({ ...payload, name: 'Outra Barbearia' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Slug já em uso' }));
    });
  });

  describe('GET /api/barbershops', () => {
    it('deve listar as barbearias cadastradas', async () => {
      const app = createApp();

      await request(app)
        .post('/api/barbershops')
        .set('Authorization', auth('owner-1'))
        .send({ name: 'Barbearia Central', slug: 'barbearia-central', phone: '+5516999999999' });

      const response = await request(app)
        .get('/api/barbershops')
        .set('Authorization', auth('owner-1'));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  });
});
