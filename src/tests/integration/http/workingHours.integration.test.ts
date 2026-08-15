import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';

function daysPayload(open = '09:00', close = '18:00') {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isOpen: dayOfWeek !== 0,
    openTime: dayOfWeek === 0 ? null : open,
    closeTime: dayOfWeek === 0 ? null : close,
  }));
}

describe('Working Hours HTTP Integration', () => {
  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  async function createContext() {
    const app = createApp();
    const unique = `wh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const barbershopRes = await request(app)
      .post('/api/barbershops')
      .send({
        name: 'Expediente Barbershop',
        email: `${unique}@example.com`,
        phone: '+5516999999999',
        password: 'SenhaForte1',
      });
    const barbershop = barbershopRes.body as { id: string };

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: `${unique}@example.com`, password: 'SenhaForte1' });
    const token = login.body.accessToken as string;

    async function createBarber(name: string) {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name,
          email: `barbeiro-${unique}-${name}@example.com`,
          phone: '11977778888',
          barbershopId: barbershop.id,
        });
      if (res.status !== 201) {
        throw new Error(`createBarber falhou (${name}): ${res.status} ${JSON.stringify(res.body)}`);
      }
      return (res.body as { id: string }).id;
    }

    return { app, barbershop, token, createBarber };
  }

  it('persiste expediente de dois barbeiros diferentes no mesmo dia', async () => {
    const { app, barbershop, token, createBarber } = await createContext();
    const barberA = await createBarber('Ana');
    const barberB = await createBarber('Bruno');

    const putA = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ barberId: barberA, days: daysPayload('09:00', '18:00') });
    expect(putA.status).toBe(200);

    const putB = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ barberId: barberB, days: daysPayload('08:00', '17:00') });
    expect(putB.status).toBe(200);

    const getA = await request(app)
      .get(`/api/barbershops/${barbershop.id}/working-hours`)
      .query({ barberId: barberA });
    expect(getA.status).toBe(200);
    expect(getA.body).toHaveLength(7);
    expect(getA.body[1]).toEqual(
      expect.objectContaining({
        dayOfWeek: 1,
        isOpen: true,
        openTime: '09:00',
        closeTime: '18:00',
      }),
    );

    const getB = await request(app)
      .get(`/api/barbershops/${barbershop.id}/working-hours`)
      .query({ barberId: barberB });
    expect(getB.status).toBe(200);
    expect(getB.body).toHaveLength(7);
    expect(getB.body[1]).toEqual(
      expect.objectContaining({
        dayOfWeek: 1,
        isOpen: true,
        openTime: '08:00',
        closeTime: '17:00',
      }),
    );
  });

  it('mantém expediente da barbearia e do barbeiro no mesmo dia sem conflito', async () => {
    const { app, barbershop, token, createBarber } = await createContext();
    const barberA = await createBarber('Carol');

    const putShop = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ days: daysPayload('09:00', '19:00') });
    expect(putShop.status).toBe(200);

    const putBarber = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ barberId: barberA, days: daysPayload('10:00', '16:00') });
    expect(putBarber.status).toBe(200);

    const getShop = await request(app).get(`/api/barbershops/${barbershop.id}/working-hours`);
    expect(getShop.status).toBe(200);
    expect(getShop.body).toHaveLength(7);
    expect(getShop.body[1]).toEqual(
      expect.objectContaining({
        dayOfWeek: 1,
        isOpen: true,
        openTime: '09:00',
        closeTime: '19:00',
      }),
    );

    const getBarber = await request(app)
      .get(`/api/barbershops/${barbershop.id}/working-hours`)
      .query({ barberId: barberA });
    expect(getBarber.status).toBe(200);
    expect(getBarber.body).toHaveLength(7);
    expect(getBarber.body[1]).toEqual(
      expect.objectContaining({
        dayOfWeek: 1,
        isOpen: true,
        openTime: '10:00',
        closeTime: '16:00',
      }),
    );

    const reSave = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ barberId: barberA, days: daysPayload('11:00', '15:00') });
    expect(reSave.status).toBe(200);

    const getBarberAgain = await request(app)
      .get(`/api/barbershops/${barbershop.id}/working-hours`)
      .query({ barberId: barberA });
    expect(getBarberAgain.status).toBe(200);
    expect(getBarberAgain.body).toHaveLength(7);
    expect(getBarberAgain.body[1]).toEqual(
      expect.objectContaining({
        dayOfWeek: 1,
        isOpen: true,
        openTime: '11:00',
        closeTime: '15:00',
      }),
    );
  });

  it('não aplica fallback: barbeiro sem horário próprio retorna lista vazia', async () => {
    const { app, barbershop, token, createBarber } = await createContext();
    const barberA = await createBarber('Davi');

    const putShop = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ days: daysPayload('09:00', '19:00') });
    expect(putShop.status).toBe(200);

    const getBarber = await request(app)
      .get(`/api/barbershops/${barbershop.id}/working-hours`)
      .query({ barberId: barberA });
    expect(getBarber.status).toBe(200);
    expect(getBarber.body).toEqual([]);

    const getShop = await request(app).get(`/api/barbershops/${barbershop.id}/working-hours`);
    expect(getShop.status).toBe(200);
    expect(getShop.body).toHaveLength(7);
  });

  it('salvar o expediente de um barbeiro não altera o de outro nem o da barbearia', async () => {
    const { app, barbershop, token, createBarber } = await createContext();
    const barberA = await createBarber('Eva');
    const barberB = await createBarber('Fabio');

    const putShop = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ days: daysPayload('09:00', '19:00') });
    expect(putShop.status).toBe(200);

    const putA = await request(app)
      .put(`/api/barbershops/${barbershop.id}/working-hours`)
      .set('Authorization', `Bearer ${token}`)
      .send({ barberId: barberA, days: daysPayload('07:00', '12:00') });
    expect(putA.status).toBe(200);

    const getB = await request(app)
      .get(`/api/barbershops/${barbershop.id}/working-hours`)
      .query({ barberId: barberB });
    expect(getB.status).toBe(200);
    expect(getB.body).toEqual([]);

    const getShop = await request(app).get(`/api/barbershops/${barbershop.id}/working-hours`);
    expect(getShop.status).toBe(200);
    expect(getShop.body).toHaveLength(7);
    expect(getShop.body[1]).toEqual(
      expect.objectContaining({ barberId: null, isOpen: true, openTime: '09:00' }),
    );
  });
});
