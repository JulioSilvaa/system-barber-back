import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import { getAccessToken } from '@/tests/helpers/auth';

describe('Error Handler HTTP Integration', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  async function loginBarbershop(app: ReturnType<typeof createApp>) {
    const created = await request(app).post('/api/barbershops').send({
      name: 'Barbearia Central',
      slug: 'barbearia-central',
      email: 'contato@barbeariacentral.com',
      phone: '+5516999999999',
      password: 'SenhaForte1',
    });

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: 'contato@barbeariacentral.com', password: 'SenhaForte1' });

    return { barbershopId: created.body.id as string, token: getAccessToken(login) };
  }

  it('deve retornar a mensagem crua fora de produção', async () => {
    process.env.NODE_ENV = 'test';
    const app = createApp();
    const { barbershopId, token } = await loginBarbershop(app);

    const response = await request(app)
      .patch(`/api/barbershops/${barbershopId}/branding`)
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: 'red' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'primaryColor must be a valid HEX color' });
  });

  it('deve ocultar a mensagem crua em produção', async () => {
    process.env.NODE_ENV = 'production';
    const app = createApp();
    const { barbershopId, token } = await loginBarbershop(app);

    const response = await request(app)
      .patch(`/api/barbershops/${barbershopId}/branding`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{ json inválido ');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erro interno do servidor' });
  });
});
