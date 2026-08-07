import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import createAuthRoutes from '@/infra/http/routes/authRoutes';
import CreateUserUseCase from '@/application/useCases/user/Create';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import CryptoUuidGenerator from '@/infra/helpers/IdGenerator';
import { generateAccessToken, generateRefreshToken } from '@/infra/helpers/GenerateToken';

function buildTestApp(userRepository: UserRepositoryMemory) {
  const app = express();
  app.use(express.json());

  const hashService = new BcryptHashService();
  const tokenService = {
    sign: (_payload: object, expiresIn: string) =>
      expiresIn === '30m' ? generateAccessToken('user-1') : generateRefreshToken('user-1'),
    verify: () => ({ sub: 'user-1', actor: 'USER' as const, barbershopId: 'barbershop-1' }),
  };

  app.use('/api', createAuthRoutes({ userRepository, hashService, tokenService }));

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

describe('Auth HTTP Integration', () => {
  const validPayload = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '11999999999',
    password: 'Password123',
  };

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  describe('POST /api/auth/login', () => {
    it('deve autenticar um usuário e retornar os tokens', async () => {
      const userRepository = new UserRepositoryMemory();
      const createUser = new CreateUserUseCase(
        userRepository,
        new BcryptHashService(),
        new CryptoUuidGenerator(),
      );
      await createUser.execute(validPayload);

      const app = buildTestApp(userRepository);
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: validPayload.email, password: validPayload.password });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.objectContaining({ email: validPayload.email }),
        }),
      );
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('deve retornar 401 quando a senha estiver incorreta', async () => {
      const userRepository = new UserRepositoryMemory();
      const createUser = new CreateUserUseCase(
        userRepository,
        new BcryptHashService(),
        new CryptoUuidGenerator(),
      );
      await createUser.execute(validPayload);

      const app = buildTestApp(userRepository);
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: validPayload.email, password: 'SenhaErrada123' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Senha incorreta' }));
    });

    it('deve retornar 404 quando o email não está cadastrado', async () => {
      const app = buildTestApp(new UserRepositoryMemory());
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nao-cadastrado@example.com', password: 'Password123' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Usuário não encontrado' }));
    });
  });
});
