import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('Appointment HTTP Integration', () => {
  const tokenService = new JwtTokenService();

  const OWNER_SUB = '123e4567-e89b-41d3-a456-426614174020';

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

  async function createBarber(app: Application, barbershopId: string) {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', auth(OWNER_SUB))
      .send({
        name: 'Barbeiro João',
        email: `barbeiro-${Date.now()}@example.com`,
        phone: '11988888888',
        password: 'Password123',
        barbershopId,
      });

    expect(response.status).toBe(201);
    return response.body as { id: string };
  }

  async function createService(app: Application, barbershopId: string) {
    const response = await request(app)
      .post(`/api/barbershops/${barbershopId}/services`)
      .set('Authorization', auth(OWNER_SUB))
      .send({ name: 'Corte de cabelo', priceCents: 4000, durationMinutes: 30 });

    expect(response.status).toBe(201);
    return response.body as { id: string };
  }

  function appointmentPayload(barberId: string, serviceId: string, startDate: string) {
    return {
      barberId,
      serviceId,
      customerName: 'Maria Souza',
      customerPhone: '16988888888',
      startDate,
    };
  }

  describe('POST /api/barbershops/:barbershopId/appointments', () => {
    it('deve criar um agendamento com endDate calculado pela duração do serviço', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id);
      const service = await createService(app, barbershop.id);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(appointmentPayload(barber.id, service.id, '2026-08-10T14:00:00.000Z'));

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          barbershopId: barbershop.id,
          barberId: barber.id,
          serviceId: service.id,
          customerName: 'Maria Souza',
          status: 'SCHEDULED',
          startDate: '2026-08-10T14:00:00.000Z',
          endDate: '2026-08-10T14:30:00.000Z',
        }),
      );
    });

    it('deve retornar 400 quando o barbeiro já tem agendamento no mesmo horário', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id);
      const service = await createService(app, barbershop.id);

      const payload = appointmentPayload(barber.id, service.id, '2026-08-10T14:00:00.000Z');

      const first = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(payload);

      expect(first.status).toBe(201);

      const second = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(payload);

      expect(second.status).toBe(400);
      expect(second.body).toEqual(
        expect.objectContaining({ message: 'Já existe um agendamento neste horário' }),
      );
    });

    it('deve permitir agendar em horário não conflitante', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id);
      const service = await createService(app, barbershop.id);

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(appointmentPayload(barber.id, service.id, '2026-08-10T14:00:00.000Z'));

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(appointmentPayload(barber.id, service.id, '2026-08-10T15:00:00.000Z'));

      expect(response.status).toBe(201);
    });

    it('deve retornar 403 quando o usuário não tem vínculo com a barbearia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id);
      const service = await createService(app, barbershop.id);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth('intruso-1'))
        .send(appointmentPayload(barber.id, service.id, '2026-08-10T14:00:00.000Z'));

      expect(response.status).toBe(403);
    });

    it('deve retornar 400 quando o serviço não pertence à barbearia', async () => {
      const app = createApp();
      const barbershopA = await createBarbershop(app, 'barbearia-a', 'Barbearia A');
      const barbershopB = await createBarbershop(app, 'barbearia-b', 'Barbearia B');
      const barber = await createBarber(app, barbershopA.id);
      const serviceB = await createService(app, barbershopB.id);

      const response = await request(app)
        .post(`/api/barbershops/${barbershopA.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(appointmentPayload(barber.id, serviceB.id, '2026-08-10T14:00:00.000Z'));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Serviço não encontrado' }));
    });
  });

  describe('GET /api/barbershops/:barbershopId/appointments', () => {
    it('deve listar os agendamentos do dia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id);
      const service = await createService(app, barbershop.id);

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(appointmentPayload(barber.id, service.id, '2026-08-10T14:00:00.000Z'));

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/appointments?date=2026-08-10`)
        .set('Authorization', auth(OWNER_SUB));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({ customerName: 'Maria Souza', status: 'SCHEDULED' }),
      );
    });
  });

  describe('PATCH /api/barbershops/:barbershopId/appointments/:id/complete e cancel', () => {
    async function createAppointment(app: Application) {
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id);
      const service = await createService(app, barbershop.id);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', auth(OWNER_SUB))
        .send(appointmentPayload(barber.id, service.id, '2026-08-10T14:00:00.000Z'));

      expect(response.status).toBe(201);
      return { barbershop, appointment: response.body as { id: string } };
    }

    it('deve concluir um agendamento', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/complete`)
        .set('Authorization', auth(OWNER_SUB));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ status: 'COMPLETED' }));
    });

    it('deve cancelar um agendamento', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/cancel`)
        .set('Authorization', auth(OWNER_SUB));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ status: 'CANCELLED' }));
    });

    it('deve retornar 400 ao concluir um agendamento já cancelado', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/cancel`)
        .set('Authorization', auth(OWNER_SUB));

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/complete`)
        .set('Authorization', auth(OWNER_SUB));

      expect(response.status).toBe(400);
    });

    it('deve retornar 404 ao agendar operação em agendamento inexistente', async () => {
      const app = createApp();
      const { barbershop } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/inexistente/complete`)
        .set('Authorization', auth(OWNER_SUB));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Agendamento não encontrado' }),
      );
    });
  });
});
