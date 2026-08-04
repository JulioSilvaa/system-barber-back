import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import createUserRoutes from '@/infra/http/routes/userRoutes';

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

  return app;
}

describe('UserController HTTP', () => {
  const validPayload = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '11999999999',
    barbershopId: '123e4567-e89b-41d3-a456-426614174000',
    password: 'Password123',
  };

  describe('POST /api/users', () => {
    it('should create a user via HTTP', async () => {
      const app = buildTestApp();

      const response = await request(app).post('/api/users').send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({ email: validPayload.email }));
    });

    it('deveria retornar 400 quando o nome não for informado', async () => {
      const app = buildTestApp();

      const response = await request(app)
        .post('/api/users')
        .send({ ...validPayload, name: '' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Nome é obrigatório' }));
    });
  });

  describe('GET /api/users', () => {
    it('deveria listar todos os usuários via HTTP', async () => {
      const app = buildTestApp();

      await request(app)
        .post('/api/users')
        .send({ ...validPayload, email: 'list-user@example.com' });

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('deveria deletar um usuário via HTTP', async () => {
      const app = buildTestApp();

      const createResponse = await request(app)
        .post('/api/users')
        .send({ ...validPayload, email: 'delete-user@example.com' });
      const userId = createResponse.body.id;

      const deleteResponse = await request(app).delete(`/api/users/${userId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toEqual(
        expect.objectContaining({ message: 'Usuário deletado com sucesso' }),
      );
    });
  });
});
