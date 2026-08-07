import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import { createMemoryRepositorySet } from '@/infra/repositories/factory';
import { Admin } from '@/domain/entities';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Admin HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  const ADMIN_ID = 'admin-1';
  const ADMIN_EMAIL = 'admin@exemplo.com';
  const ADMIN_PASSWORD = 'SenhaForte123';

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  async function buildApp() {
    const repositories = createMemoryRepositorySet();
    const hashService = new BcryptHashService();

    await repositories.adminRepository.save(
      new Admin({
        id: ADMIN_ID,
        name: 'Admin Plataforma',
        email: ADMIN_EMAIL,
        password: await hashService.hash(ADMIN_PASSWORD),
      }),
    );

    const app: Application = createApp({ repositories });
    return { app, repositories, hashService };
  }

  function adminToken(sub: string = ADMIN_ID) {
    return `Bearer ${tokenService.sign({ sub, actor: 'ADMIN' }, '30m')}`;
  }

  function userToken() {
    return `Bearer ${tokenService.sign({ sub: 'user-1', actor: 'USER' }, '30m')}`;
  }

  describe('POST /api/admin/login', () => {
    it('deve autenticar o admin e retornar os tokens', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admin/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          admin: expect.objectContaining({ id: ADMIN_ID, email: ADMIN_EMAIL }),
        }),
      );
    });

    it('deve retornar 401 com senha incorreta', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admin/login')
        .send({ email: ADMIN_EMAIL, password: 'SenhaErrada123' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Senha incorreta' }));
    });

    it('deve retornar 404 quando o admin não existe', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admin/login')
        .send({ email: 'nao-existe@exemplo.com', password: ADMIN_PASSWORD });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Admin não encontrado' }));
    });

    it('deve retornar 404 quando o admin está inativo', async () => {
      const { app, repositories } = await buildApp();
      await repositories.adminRepository.save(
        new Admin({
          id: 'admin-inativo',
          name: 'Admin Inativo',
          email: 'inativo@exemplo.com',
          password: await new BcryptHashService().hash(ADMIN_PASSWORD),
          isActive: false,
        }),
      );

      const response = await request(app)
        .post('/api/admin/login')
        .send({ email: 'inativo@exemplo.com', password: ADMIN_PASSWORD });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Admin inativo' }));
    });
  });

  describe('POST /api/admins', () => {
    it('deve criar outro admin', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admins')
        .set('Authorization', adminToken())
        .send({ name: 'Admin Suporte', email: 'suporte@exemplo.com', password: 'SenhaForte456' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({ email: 'suporte@exemplo.com', isActive: true }),
      );
    });

    it('deve retornar 401 sem token', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admins')
        .send({ name: 'Admin Suporte', email: 'suporte@exemplo.com', password: 'SenhaForte456' });

      expect(response.status).toBe(401);
    });

    it('deve retornar 403 para um usuário que não é admin', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admins')
        .set('Authorization', userToken())
        .send({ name: 'Admin Suporte', email: 'suporte@exemplo.com', password: 'SenhaForte456' });

      expect(response.status).toBe(403);
    });

    it('deve retornar 400 com nome muito curto', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admins')
        .set('Authorization', adminToken())
        .send({ name: 'A', email: 'suporte@exemplo.com', password: 'SenhaForte123' });

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 com senha fraca', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .post('/api/admins')
        .set('Authorization', adminToken())
        .send({ name: 'Admin Suporte', email: 'senha-fraca@exemplo.com', password: 'fraca' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Senha deve ter entre 8 e 72 caracteres' }),
      );
    });
  });

  describe('GET /api/admins', () => {
    it('deve listar os admins', async () => {
      const { app } = await buildApp();

      const response = await request(app).get('/api/admins').set('Authorization', adminToken());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((a: { email: string }) => a.email === ADMIN_EMAIL)).toBe(true);
    });

    it('deve retornar 401 sem token', async () => {
      const { app } = await buildApp();

      const response = await request(app).get('/api/admins');

      expect(response.status).toBe(401);
    });

    it('deve retornar 403 para um usuário que não é admin', async () => {
      const { app } = await buildApp();

      const response = await request(app).get('/api/admins').set('Authorization', userToken());

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/admins/:id', () => {
    it('deve excluir outro admin', async () => {
      const { app, repositories } = await buildApp();
      await repositories.adminRepository.save(
        new Admin({
          id: 'admin-2',
          name: 'Admin Suporte',
          email: 'suporte@exemplo.com',
          password: await new BcryptHashService().hash('SenhaForte456'),
        }),
      );

      const response = await request(app)
        .delete('/api/admins/admin-2')
        .set('Authorization', adminToken());

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Admin excluído com sucesso' }),
      );
      expect(await repositories.adminRepository.findById('admin-2')).toBeNull();
    });

    it('deve retornar 400 ao tentar excluir a si mesmo', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .delete('/api/admins/admin-1')
        .set('Authorization', adminToken(ADMIN_ID));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Não é possível excluir o próprio admin' }),
      );
    });

    it('deve retornar 403 para um usuário que não é admin', async () => {
      const { app } = await buildApp();

      const response = await request(app)
        .delete('/api/admins/admin-2')
        .set('Authorization', userToken());

      expect(response.status).toBe(403);
    });
  });
});
