import request from 'supertest';
import type { Application } from 'express';
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

  function auth(sub: string, actor: 'USER' | 'BARBERSHOP' | 'ADMIN' = 'USER') {
    return `Bearer ${tokenService.sign({ sub, actor }, '30m')}`;
  }

  const barbershopPayload = {
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    email: 'contato@barbeariacentral.com',
    phone: '+5516999999999',
    password: 'SenhaForte1',
  };

  describe('POST /api/barbershops', () => {
    it('deve criar uma barbearia publicamente (sem token) e não criar vínculo de dono', async () => {
      const app = createApp();

      const response = await request(app).post('/api/barbershops').send(barbershopPayload);

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
        .set('Authorization', auth('owner-1'));

      expect(membershipsResponse.status).toBe(200);
      expect(membershipsResponse.body).toEqual([]);
    });

    it('deve retornar 400 quando o slug já está em uso', async () => {
      const app = createApp();

      await request(app).post('/api/barbershops').send(barbershopPayload);

      const response = await request(app)
        .post('/api/barbershops')
        .send({ ...barbershopPayload, name: 'Outra Barbearia' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Slug já em uso' }));
    });

    it('deve retornar 400 quando o email já está em uso', async () => {
      const app = createApp();

      await request(app).post('/api/barbershops').send(barbershopPayload);

      const response = await request(app)
        .post('/api/barbershops')
        .send({ ...barbershopPayload, slug: 'outra-barbearia' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Email já em uso' }));
    });
  });

  describe('GET /api/barbershops', () => {
    it('deve listar as barbearias cadastradas publicamente', async () => {
      const app = createApp();

      await request(app).post('/api/barbershops').send(barbershopPayload);

      const response = await request(app).get('/api/barbershops');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /api/barbershops/:identifier/barbers', () => {
    async function setupBarbershopWithBarber(app: Application) {
      const barbershop = await request(app).post('/api/barbershops').send(barbershopPayload);
      expect(barbershop.status).toBe(201);

      const login = await request(app)
        .post('/api/barbershops/login')
        .send({ email: barbershopPayload.email, password: barbershopPayload.password });
      expect(login.status).toBe(200);
      const barbershopToken = login.body.accessToken as string;

      const barber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({
          name: 'Barbeiro João',
          email: 'barbeiro-publico@example.com',
          phone: '11988888888',
          password: 'Password123',
          barbershopId: barbershop.body.id,
        });

      expect(barber.status).toBe(201);
      return barbershop;
    }

    it('deve listar publicamente apenas os barbeiros com papel BARBER (sem o dono)', async () => {
      const app = createApp();
      await setupBarbershopWithBarber(app);

      const response = await request(app).get('/api/barbershops/barbearia-central/barbers');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Barbeiro João');
      expect(response.body[0].localRole).toBe('BARBER');
      expect(response.body.some((b: { localRole: string }) => b.localRole === 'OWNER')).toBe(false);
    });

    it('deve retornar 404 quando a barbearia não existe', async () => {
      const app = createApp();

      const response = await request(app).get('/api/barbershops/barbearia-inexistente/barbers');

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Barbearia não encontrada' }),
      );
    });
  });

  describe('GET /api/barbershops/:barbershopId/employees', () => {
    async function setupBarbershopWithBarber(app: Application) {
      const barbershop = await request(app).post('/api/barbershops').send(barbershopPayload);
      expect(barbershop.status).toBe(201);
      const barbershopId = barbershop.body.id as string;

      const login = await request(app)
        .post('/api/barbershops/login')
        .send({ email: barbershopPayload.email, password: barbershopPayload.password });
      expect(login.status).toBe(200);
      const barbershopToken = login.body.accessToken as string;

      const barber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({
          name: 'Barbeiro João',
          email: 'barbeiro-publico@example.com',
          phone: '11988888888',
          password: 'Password123',
          barbershopId,
        });
      expect(barber.status).toBe(201);

      return { barbershopId, barbershopToken, barberId: barber.body.id as string };
    }

    it('deve listar os funcionários da barbearia para o dono, com userId e nome', async () => {
      const app = createApp();
      const { barbershopId, barbershopToken, barberId } = await setupBarbershopWithBarber(app);

      const response = await request(app)
        .get(`/api/barbershops/${barbershopId}/employees`)
        .set('Authorization', `Bearer ${barbershopToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual([
        expect.objectContaining({
          userId: barberId,
          name: 'Barbeiro João',
          phone: '11988888888',
          localRole: 'BARBER',
          status: 'ACTIVE',
        }),
      ]);
    });

    it('deve retornar 401 sem token', async () => {
      const app = createApp();
      const { barbershopId } = await setupBarbershopWithBarber(app);

      const response = await request(app).get(`/api/barbershops/${barbershopId}/employees`);

      expect(response.status).toBe(401);
    });

    it('deve retornar 403 quando outro ator tenta listar os funcionários', async () => {
      const app = createApp();
      const { barbershopId } = await setupBarbershopWithBarber(app);

      const response = await request(app)
        .get(`/api/barbershops/${barbershopId}/employees`)
        .set('Authorization', auth('intruso-1'));

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/barbershops/login', () => {
    async function createBarbershop(app: Application) {
      const response = await request(app).post('/api/barbershops').send(barbershopPayload);
      expect(response.status).toBe(201);
    }

    it('deve autenticar a barbearia com email e senha corretos', async () => {
      const app = createApp();
      await createBarbershop(app);

      const response = await request(app)
        .post('/api/barbershops/login')
        .send({ email: 'contato@barbeariacentral.com', password: 'SenhaForte1' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          barbershop: expect.objectContaining({
            id: expect.any(String),
            email: 'contato@barbeariacentral.com',
          }),
        }),
      );
    });

    it('deve retornar 401 quando a senha está incorreta', async () => {
      const app = createApp();
      await createBarbershop(app);

      const response = await request(app)
        .post('/api/barbershops/login')
        .send({ email: 'contato@barbeariacentral.com', password: 'senha-errada' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Senha incorreta' }));
    });

    it('deve retornar 404 quando a barbearia não existe', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/api/barbershops/login')
        .send({ email: 'nao-existe@example.com', password: 'SenhaForte1' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Barbearia não encontrada' }),
      );
    });
  });
});
