import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';

describe('Evaluation HTTP Integration', () => {
  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  async function createCompletedAppointment(app: Application) {
    const unique = `eval-${Date.now().toString(36)}`;
    const barbershopRes = await request(app)
      .post('/api/barbershops')
      .send({
        name: 'Avaliação Barbershop',
        email: `${unique}@example.com`,
        phone: '+5516999999999',
        password: 'SenhaForte1',
      });
    const barbershop = barbershopRes.body as { id: string; slug: string };

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: `${unique}@example.com`, password: 'SenhaForte1' });
    const token = login.body.accessToken as string;

    const barber = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Barbeiro Avaliação',
        email: `barbeiro-${unique}@example.com`,
        phone: '11977778888',
        barbershopId: barbershop.id,
      });
    const barberId = (barber.body as { id: string }).id;

    const service = await request(app)
      .post(`/api/barbershops/${barbershop.id}/services`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corte Especial', priceCents: 5000, durationMinutes: 40 });
    const serviceId = (service.body as { id: string }).id;

    const appointment = await request(app)
      .post(`/api/barbershops/${barbershop.id}/appointments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        barberId,
        serviceId,
        customerName: 'Cliente Avaliação',
        customerPhone: '16988887777',
        startDate: '2026-08-20T15:00:00.000Z',
      });
    const appointmentId = (appointment.body as { id: string }).id;

    const completed = await request(app)
      .patch(`/api/barbershops/${barbershop.id}/appointments/${appointmentId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paidPriceCents: 5000, paymentMethod: 'PIX' });

    expect(completed.status).toBe(200);

    return { barbershop, token, appointmentId };
  }

  it('avalia um atendimento concluído via rota pública pelo slug', async () => {
    const app = createApp();
    const { barbershop, appointmentId } = await createCompletedAppointment(app);

    const response = await request(app)
      .post(`/api/barbershops/${barbershop.slug}/evaluations`)
      .send({ appointmentId, rating: 5, comment: 'Atendimento nota dez!' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({ appointmentId, rating: 5, comment: 'Atendimento nota dez!' }),
    );

    const duplicate = await request(app)
      .post(`/api/barbershops/${barbershop.slug}/evaluations`)
      .send({ appointmentId, rating: 4 });

    expect(duplicate.status).toBe(400);
    expect(duplicate.body.code).toBe('EVALUATION_ALREADY_EXISTS');
  });

  it('consulta o status público da avaliação', async () => {
    const app = createApp();
    const { barbershop, appointmentId } = await createCompletedAppointment(app);

    const before = await request(app).get(
      `/api/barbershops/${barbershop.slug}/evaluations/${appointmentId}/status`,
    );

    expect(before.status).toBe(200);
    expect(before.body).toEqual({ canEvaluate: true, alreadyEvaluated: false });

    await request(app)
      .post(`/api/barbershops/${barbershop.slug}/evaluations`)
      .send({ appointmentId, rating: 3 });

    const after = await request(app).get(
      `/api/barbershops/${barbershop.slug}/evaluations/${appointmentId}/status`,
    );

    expect(after.body).toEqual({ canEvaluate: false, alreadyEvaluated: true });
  });

  it('lista avaliações no painel do dono', async () => {
    const app = createApp();
    const { barbershop, token, appointmentId } = await createCompletedAppointment(app);

    await request(app)
      .post(`/api/barbershops/${barbershop.slug}/evaluations`)
      .send({ appointmentId, rating: 5, comment: 'Muito bom' });

    const response = await request(app)
      .get(`/api/barbershops/${barbershop.id}/evaluations`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ rating: 5, comment: 'Muito bom' });
  });
});
