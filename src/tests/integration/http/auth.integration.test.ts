import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import { createMemoryRepositorySet } from '@/infra/repositories/factory';
import { Admin } from '@/domain/entities';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import { getAccessToken } from '@/tests/helpers/auth';

function extractCookie(loginResponse: { headers: Record<string, unknown> }, name: string): string {
  const cookies = loginResponse.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = (cookies ?? []).find(value => value.startsWith(`${name}=`));
  return cookie?.split(';')[0] ?? '';
}

function buildCookieHeader(...parts: string[]): string {
  return parts.filter(Boolean).join('; ');
}

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  const barbershopPayload = {
    name: 'Barbearia Refresh',
    email: 'refresh@barbearia.com',
    phone: '+5516999999999',
    password: 'SenhaForte1',
  };

  it('retorna 401 quando o cookie de refresh não é fornecido', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/refresh');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(expect.objectContaining({ message: 'Token não fornecido' }));
  });

  it('retorna 401 e limpa os cookies quando o refresh token é inválido', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'sb_refresh_token=token-invalido');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({ message: 'Token inválido ou expirado' }),
    );
    const setCookies = response.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookies ?? []).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sb_access_token=;'),
        expect.stringContaining('sb_refresh_token=;'),
      ]),
    );
  });

  it('renova os tokens de uma barbearia e o novo access token funciona no /me', async () => {
    const app = createApp();
    await request(app).post('/api/barbershops').send(barbershopPayload);

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: barbershopPayload.email, password: barbershopPayload.password });
    expect(login.status).toBe(200);

    const cookies = buildCookieHeader(
      extractCookie(login, 'sb_access_token'),
      extractCookie(login, 'sb_refresh_token'),
    );

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookies);

    expect(refresh.status).toBe(200);
    expect(refresh.body).toEqual({ ok: true });
    expect(refresh.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sb_access_token='),
        expect.stringContaining('sb_refresh_token='),
      ]),
    );

    const newAccess = extractCookie(refresh, 'sb_access_token');
    const me = await request(app)
      .get('/api/barbershops/me')
      .set('Cookie', buildCookieHeader(newAccess));

    expect(me.status).toBe(200);
    expect(me.body).toEqual(
      expect.objectContaining({ id: expect.any(String), email: barbershopPayload.email }),
    );
  });

  it('renova os tokens de um admin', async () => {
    const repositories = createMemoryRepositorySet();
    const hashService = new BcryptHashService();
    await repositories.adminRepository.save(
      new Admin({
        id: 'admin-refresh',
        name: 'Admin Plataforma',
        email: 'admin@exemplo.com',
        password: await hashService.hash('SenhaForte123'),
      }),
    );
    const app = createApp({ repositories });

    const login = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@exemplo.com', password: 'SenhaForte123' });
    expect(login.status).toBe(200);

    const cookies = buildCookieHeader(
      extractCookie(login, 'sb_access_token'),
      extractCookie(login, 'sb_refresh_token'),
    );

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookies);

    expect(refresh.status).toBe(200);
    expect(refresh.body).toEqual({ ok: true });
    expect(getAccessToken(refresh)).toBeTruthy();
  });
});
