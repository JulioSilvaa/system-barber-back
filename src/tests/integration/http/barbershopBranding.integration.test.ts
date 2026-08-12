import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import { UPLOADS_DIR } from '@/infra/http/helpers/logoUpload';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Barbershop Branding HTTP Integration', () => {
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

  describe('PATCH /api/barbershops/:id/branding', () => {
    it('deve atualizar nome e cor primária da própria barbearia', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/branding`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ name: 'Central Barber', primaryColor: '#7c3aed' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: barbershop.id,
          name: 'Central Barber',
          primaryColor: '#7c3aed',
        }),
      );
    });

    it('deve retornar 403 para outra barbearia', async () => {
      const app = createApp();
      const { barbershop } = await createBarbershop(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/branding`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: 'outra-barbearia', actor: 'BARBERSHOP' }, '30m')}`,
        )
        .send({ name: 'Invasor' });

      expect(response.status).toBe(403);
    });

    it('deve retornar 401 sem token', async () => {
      const app = createApp();
      const { barbershop } = await createBarbershop(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/branding`)
        .send({ name: 'Central Barber' });

      expect(response.status).toBe(401);
    });

    it('deve rejeitar nome vazio', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/branding`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ name: '   ' });

      expect(response.status).toBe(400);
    });

    it('deve expor os campos de branding na rota pública', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/branding`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ name: 'Central Barber', primaryColor: '#7c3aed' });

      const response = await request(app).get('/api/barbershops/barbearia-central');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          name: 'Central Barber',
          primaryColor: '#7c3aed',
        }),
      );
    });
  });

  describe('POST /api/barbershops/:id/branding/logo', () => {
    it('deve enviar logo e retornar a URL pública', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/branding/logo`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .attach('logo', Buffer.from('fake-image-content'), {
          filename: 'logo.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(response.body.logoUrl).toMatch(
        new RegExp(`^/uploads/logo-${barbershop.id}\\.png\\?v=\\d+$`),
      );

      const uploadedPath = path.join(UPLOADS_DIR, `logo-${barbershop.id}.png`);
      expect(fs.existsSync(uploadedPath)).toBe(true);
      fs.unlinkSync(uploadedPath);

      const publicResponse = await request(app).get(`/uploads/logo-${barbershop.id}.png`);
      expect(publicResponse.status).toBe(404);
    });

    it('deve retornar 400 para arquivo com extensão não permitida', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/branding/logo`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .attach('logo', Buffer.from('fake-content'), {
          filename: 'logo.exe',
          contentType: 'application/octet-stream',
        });

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 sem arquivo', async () => {
      const app = createApp();
      const { barbershop, barbershopToken } = await createBarbershop(app);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/branding/logo`)
        .set('Authorization', `Bearer ${barbershopToken}`);

      expect(response.status).toBe(400);
    });

    it('deve retornar 403 para outra barbearia', async () => {
      const app = createApp();
      const { barbershop } = await createBarbershop(app);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/branding/logo`)
        .set(
          'Authorization',
          `Bearer ${tokenService.sign({ sub: 'outra-barbearia', actor: 'BARBERSHOP' }, '30m')}`,
        )
        .attach('logo', Buffer.from('fake-image-content'), {
          filename: 'logo.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/barbershops/:identifier/working-hours (público)', () => {
    it('deve retornar horários padrão para barbearia existente', async () => {
      const app = createApp();
      const { barbershop } = await createBarbershop(app);

      const response = await request(app).get('/api/barbershops/barbearia-central/working-hours');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(7);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          barbershopId: barbershop.id,
          dayOfWeek: 0,
          isOpen: false,
        }),
      );
      expect(response.body[1]).toEqual(
        expect.objectContaining({ dayOfWeek: 1, isOpen: true, openTime: '09:00' }),
      );
    });

    it('deve aceitar id ou slug como identificador', async () => {
      const app = createApp();
      const { barbershop } = await createBarbershop(app);

      const byId = await request(app).get(`/api/barbershops/${barbershop.id}/working-hours`);
      const bySlug = await request(app).get('/api/barbershops/barbearia-central/working-hours');

      expect(byId.status).toBe(200);
      expect(bySlug.status).toBe(200);
      expect(byId.body).toHaveLength(bySlug.body.length);
    });

    it('deve retornar 404 para barbearia inexistente', async () => {
      const app = createApp();

      const response = await request(app).get('/api/barbershops/nao-existe/working-hours');

      expect(response.status).toBe(404);
    });
  });
});
