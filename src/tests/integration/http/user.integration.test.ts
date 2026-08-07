import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import createUserRoutes from '@/infra/http/routes/userRoutes';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.use('/api', createUserRoutes());

  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: 'Internal Server Error' });
    },
  );

  return { app };
}

describe('User HTTP Integration', () => {
  const validPayload = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '11999999999',
    password: 'Password123',
  };

  const tokenService = new JwtTokenService();

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  function adminAuth() {
    return `Bearer ${tokenService.sign({ sub: 'admin-1', actor: 'ADMIN' }, '30m')}`;
  }

  function barbershopAuth(barbershopId = 'barbershop-1') {
    return `Bearer ${tokenService.sign({ sub: barbershopId, actor: 'BARBERSHOP' }, '30m')}`;
  }

  function userAuth() {
    return `Bearer ${tokenService.sign({ sub: 'user-1', actor: 'USER' }, '30m')}`;
  }

  describe('POST /api/users', () => {
    it('deve criar um usuário global via HTTP (requer token da própria barbearia)', async () => {
      const { app } = buildTestApp();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', barbershopAuth())
        .send({ ...validPayload, barbershopId: 'barbershop-1' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          email: validPayload.email,
          name: validPayload.name,
          phone: validPayload.phone,
          isActive: true,
        }),
      );
      expect(response.body).not.toHaveProperty('globalRole');
      expect(response.body).not.toHaveProperty('barbershopId');
      expect(response.body).not.toHaveProperty('role');
    });

    it('deve retornar 401 quando não há token', async () => {
      const { app } = buildTestApp();

      const response = await request(app).post('/api/users').send(validPayload);

      expect(response.status).toBe(401);
    });

    it('deve retornar 403 quando um usuário comum tenta criar um usuário', async () => {
      const { app } = buildTestApp();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', userAuth())
        .send({ ...validPayload, barbershopId: 'barbershop-1' });

      expect(response.status).toBe(403);
    });

    it('deve retornar 403 quando a barbearia do token não bate com a do corpo', async () => {
      const { app } = buildTestApp();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', barbershopAuth('barbershop-2'))
        .send({ ...validPayload, barbershopId: 'barbershop-1' });

      expect(response.status).toBe(403);
    });

    it('deve retornar 400 quando o nome não for informado', async () => {
      const { app } = buildTestApp();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', barbershopAuth())
        .send({ ...validPayload, name: '', barbershopId: 'barbershop-1' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Nome é obrigatório' }));
    });
  });

  describe('GET /api/users', () => {
    it('deve listar todos os usuários via HTTP (somente admin)', async () => {
      const { app } = buildTestApp();

      await request(app)
        .post('/api/users')
        .set('Authorization', barbershopAuth())
        .send({ ...validPayload, email: 'list-user@example.com', barbershopId: 'barbershop-1' });

      const response = await request(app).get('/api/users').set('Authorization', adminAuth());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('deve retornar 401 sem token', async () => {
      const { app } = buildTestApp();

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
    });

    it('deve retornar 403 para quem não é admin', async () => {
      const { app } = buildTestApp();

      const response = await request(app).get('/api/users').set('Authorization', userAuth());

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('deve deletar um usuário via HTTP (somente admin)', async () => {
      const { app } = buildTestApp();

      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', barbershopAuth())
        .send({ ...validPayload, email: 'delete-user@example.com', barbershopId: 'barbershop-1' });
      const userId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', adminAuth());

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toEqual(
        expect.objectContaining({ message: 'Usuário deletado com sucesso' }),
      );
    });

    it('deve retornar 403 quando um usuário comum tenta deletar', async () => {
      const { app } = buildTestApp();

      const response = await request(app)
        .delete('/api/users/123e4567-e89b-41d3-a456-426614174000')
        .set('Authorization', userAuth());

      expect(response.status).toBe(403);
    });
  });

  describe('Isolamento de estado', () => {
    it('não deve compartilhar repositório entre apps distintos', async () => {
      const { app: appA } = buildTestApp();
      const { app: appB } = buildTestApp();

      await request(appA)
        .post('/api/users')
        .set('Authorization', barbershopAuth())
        .send({ ...validPayload, email: 'isolado@example.com', barbershopId: 'barbershop-1' });

      const responseB = await request(appB).get('/api/users').set('Authorization', adminAuth());

      expect(responseB.status).toBe(200);
      expect(responseB.body).toEqual([]);
    });
  });
});
