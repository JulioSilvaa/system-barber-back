import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Membership HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  const OWNER_SUB = '123e4567-e89b-41d3-a456-426614174001';

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

  describe('Fluxo completo: dono cria barbeiro e vincula', () => {
    it('deve criar barbeiro vinculado, adicionar em outra barbearia e trocar o vínculo ativo', async () => {
      const app = createApp();

      const barbershopA = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barbershopB = await createBarbershop(app, 'barbearia-norte', 'Barbearia Norte');

      const barberPayload = {
        name: 'Barbeiro João',
        email: 'barbeiro@example.com',
        phone: '11988888888',
        password: 'Password123',
        barbershopId: barbershopA.id,
      };

      const createBarber = await request(app)
        .post('/api/users')
        .set('Authorization', auth(OWNER_SUB))
        .send(barberPayload);

      expect(createBarber.status).toBe(201);
      expect(createBarber.body.globalRole).toBe('USER');
      const barberId = createBarber.body.id as string;

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: barberPayload.email, password: barberPayload.password });

      expect(login.status).toBe(200);
      expect(login.body.user).toEqual(
        expect.objectContaining({ barbershopId: barbershopA.id, localRole: 'BARBER' }),
      );

      const addToB = await request(app)
        .post('/api/memberships')
        .set('Authorization', auth(OWNER_SUB))
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

      const loginAfterSwitch = await request(app)
        .post('/api/auth/login')
        .send({ email: barberPayload.email, password: barberPayload.password });

      expect(loginAfterSwitch.body.user.barbershopId).toBe(barbershopB.id);
    });

    it('deve retornar 403 quando um usuário sem vínculo tenta adicionar um barbeiro', async () => {
      const app = createApp();

      const barbershop = await createBarbershop(app, 'barbearia-sul', 'Barbearia Sul');

      const response = await request(app)
        .post('/api/memberships')
        .set('Authorization', auth('intruso-1'))
        .send({ userId: 'qualquer-usuario', barbershopId: barbershop.id });

      expect(response.status).toBe(403);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Acesso negado' }));
    });

    it('deve retornar 401 sem token ao listar vínculos', async () => {
      const app = createApp();

      const response = await request(app).get('/api/memberships');

      expect(response.status).toBe(401);
    });
  });
});
