import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Membership HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  function auth(sub: string, actor: 'USER' | 'BARBERSHOP' | 'ADMIN' = 'USER') {
    return `Bearer ${tokenService.sign({ sub, actor }, '30m')}`;
  }

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
    return response.body as { id: string };
  }

  async function loginBarbershop(app: Application, slug: string) {
    const response = await request(app)
      .post('/api/barbershops/login')
      .send({ email: `${slug}@example.com`, password: 'SenhaForte1' });

    expect(response.status).toBe(200);
    return response.body.accessToken as string;
  }

  describe('Fluxo completo: barbearia cria barbeiro e vincula', () => {
    it('deve criar barbeiro vinculado, adicionar em outra barbearia e trocar o vínculo ativo', async () => {
      const app = createApp();

      const barbershopA = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barbershopB = await createBarbershop(app, 'barbearia-norte', 'Barbearia Norte');
      const barbershopAToken = await loginBarbershop(app, 'barbearia-central');
      const barbershopBToken = await loginBarbershop(app, 'barbearia-norte');

      const barberPayload = {
        name: 'Barbeiro João',
        email: 'barbeiro@example.com',
        phone: '11988888888',
        barbershopId: barbershopA.id,
      };

      const createBarber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopAToken}`)
        .send(barberPayload);

      expect(createBarber.status).toBe(201);
      expect(createBarber.body).not.toHaveProperty('globalRole');
      const barberId = createBarber.body.id as string;

      const addToB = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${barbershopBToken}`)
        .send({ userId: barberId, barbershopId: barbershopB.id });

      expect(addToB.status).toBe(201);
      expect(addToB.body).toEqual(
        expect.objectContaining({ barbershopId: barbershopB.id, localRole: 'BARBER' }),
      );

      const list = await request(app).get('/api/memberships').set('Authorization', auth(barberId));

      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(2);

      const switchResponse = await request(app)
        .post('/api/memberships/switch')
        .set('Authorization', auth(barberId))
        .send({ barbershopId: barbershopB.id });

      expect(switchResponse.status).toBe(200);
      const activeAfterSwitch = switchResponse.body.find(
        (membership: { barbershopId: string; status: string }) => membership.status === 'ACTIVE',
      );
      expect(activeAfterSwitch.barbershopId).toBe(barbershopB.id);
    });

    it('deve retornar 403 quando um usuário (não a barbearia) tenta adicionar um barbeiro', async () => {
      const app = createApp();

      const barbershop = await createBarbershop(app, 'barbearia-sul', 'Barbearia Sul');

      const response = await request(app)
        .post('/api/memberships')
        .set('Authorization', auth('intruso-1'))
        .send({ userId: 'qualquer-usuario', barbershopId: barbershop.id });

      expect(response.status).toBe(403);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Acesso negado' }));
    });

    it('deve retornar 403 quando a barbearia tenta adicionar barbeiro em outra barbearia', async () => {
      const app = createApp();

      await createBarbershop(app, 'barbearia-leste', 'Barbearia Leste');
      const barbershopB = await createBarbershop(app, 'barbearia-oeste', 'Barbearia Oeste');
      const barbershopAToken = await loginBarbershop(app, 'barbearia-leste');

      const response = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${barbershopAToken}`)
        .send({ userId: 'qualquer-usuario', barbershopId: barbershopB.id });

      expect(response.status).toBe(403);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Acesso negado' }));
    });

    it('deve retornar 401 sem token ao listar vínculos', async () => {
      const app = createApp();

      const response = await request(app).get('/api/memberships');

      expect(response.status).toBe(401);
    });
  });

  describe('ListByBarbershop', () => {
    it('deve listar os vínculos de uma barbearia', async () => {
      const app = createApp();

      const barbershop = await createBarbershop(app, 'barbearia-list', 'Barbearia List');
      const barbershopToken = await loginBarbershop(app, 'barbearia-list');

      const createBarber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({
          name: 'Barbeiro Lista',
          email: 'lista@example.com',
          phone: '11911111111',
          barbershopId: barbershop.id,
        });

      expect(createBarber.status).toBe(201);
      const barberId = createBarber.body.id as string;

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/memberships`)
        .set('Authorization', `Bearer ${barbershopToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({ userId: barberId, barbershopId: barbershop.id }),
      );
    });

    it('deve retornar 403 para usuário não sendo a própria barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-intrusa', 'Barbearia Intrusa');

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/memberships`)
        .set('Authorization', auth('intruso-1'));

      expect(response.status).toBe(403);
    });
  });

  describe('UpdateBarberStatus', () => {
    it('deve atualizar o status do vínculo', async () => {
      const app = createApp();

      const barbershop = await createBarbershop(app, 'barbearia-status', 'Barbearia Status');
      const barbershopToken = await loginBarbershop(app, 'barbearia-status');

      const createBarber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({
          name: 'Barbeiro Status',
          email: 'status@example.com',
          phone: '11977777777',
          barbershopId: barbershop.id,
        });

      expect(createBarber.status).toBe(201);
      const barberId = createBarber.body.id as string;

      const list = await request(app)
        .get(`/api/barbershops/${barbershop.id}/memberships`)
        .set('Authorization', `Bearer ${barbershopToken}`);

      const membershipId = list.body[0].id as string;

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/memberships/${membershipId}/status`)
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({ id: membershipId, userId: barberId, status: 'INACTIVE' }),
      );
    });
  });

  describe('RemoveBarber', () => {
    it('deve remover um barbeiro do vínculo', async () => {
      const app = createApp();

      const barbershop = await createBarbershop(app, 'barbearia-remove', 'Barbearia Remove');
      const barbershopToken = await loginBarbershop(app, 'barbearia-remove');

      const createBarber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({
          name: 'Barbeiro Remove',
          email: 'remove@example.com',
          phone: '11966666666',
          barbershopId: barbershop.id,
        });

      expect(createBarber.status).toBe(201);

      const list = await request(app)
        .get(`/api/barbershops/${barbershop.id}/memberships`)
        .set('Authorization', `Bearer ${barbershopToken}`);

      const membershipId = list.body[0].id as string;

      const response = await request(app)
        .delete(`/api/barbershops/${barbershop.id}/memberships/${membershipId}`)
        .set('Authorization', `Bearer ${barbershopToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Barbeiro removido com sucesso' }),
      );

      const after = await request(app)
        .get(`/api/barbershops/${barbershop.id}/memberships`)
        .set('Authorization', `Bearer ${barbershopToken}`);

      expect(after.body).toHaveLength(0);
    });
  });

  describe('Validação de payload (bug prisma id undefined)', () => {
    it('deve retornar 400 quando userId está ausente ao adicionar barbeiro', async () => {
      const app = createApp();

      const barbershop = await createBarbershop(app, 'barbearia-validacao', 'Barbearia Validacao');
      const barbershopToken = await loginBarbershop(app, 'barbearia-validacao');

      const response = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ barbershopId: barbershop.id });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('userId é obrigatório');
    });

    it('deve retornar 403 quando barbershopId está ausente ao adicionar barbeiro (middleware bloqueia)', async () => {
      const app = createApp();

      const barbershop = await createBarbershop(app, 'barbearia-validacao2', 'Validacao 2');
      const barbershopToken = await loginBarbershop(app, 'barbearia-validacao2');

      const barberPayload = {
        name: 'Barbeiro Robot',
        email: 'robot@example.com',
        phone: '11955555555',
        barbershopId: barbershop.id,
      };

      const createBarber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send(barberPayload);

      expect(createBarber.status).toBe(201);
      const barberId = createBarber.body.id as string;

      const response = await request(app)
        .post('/api/memberships')
        .set('Authorization', `Bearer ${barbershopToken}`)
        .send({ userId: barberId });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Acesso negado');
    });
  });
});
