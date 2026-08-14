import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/infra/http/express/app';

describe('Appointment HTTP Integration', () => {
  beforeEach(() => {
    process.env.BCRYPT_SALT = '10';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

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
    const id = (response.body as { id: string }).id;

    const login = await request(app)
      .post('/api/barbershops/login')
      .send({ email: `${slug}@example.com`, password: 'SenhaForte1' });

    expect(login.status).toBe(200);

    return {
      id,
      token: login.body.accessToken as string,
    };
  }

  async function createBarber(app: Application, barbershopId: string, token: string) {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Barbeiro João',
        email: `barbeiro-${Date.now()}@example.com`,
        phone: '11988888888',
        barbershopId,
      });

    expect(response.status).toBe(201);
    return response.body as { id: string };
  }

  async function createService(app: Application, barbershopId: string, token: string) {
    const response = await request(app)
      .post(`/api/barbershops/${barbershopId}/services`)
      .set('Authorization', `Bearer ${token}`)
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
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          barbershopId: barbershop.id,
          barberId: barber.id,
          serviceId: service.id,
          customerName: 'Maria Souza',
          status: 'SCHEDULED',
          startDate: '2026-08-20T14:00:00.000Z',
          endDate: '2026-08-20T14:30:00.000Z',
        }),
      );
    });

    it('deve retornar 400 quando o barbeiro já tem agendamento no mesmo horário', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const payload = appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z');

      const first = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(payload);

      expect(first.status).toBe(201);

      const second = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(payload);

      expect(second.status).toBe(400);
      expect(second.body).toEqual(
        expect.objectContaining({ message: 'Já existe um agendamento neste horário' }),
      );
    });

    it('deve permitir agendar em horário não conflitante', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T15:00:00.000Z'));

      expect(response.status).toBe(201);
    });

    it('deve permitir criar agendamento sem autenticação (rota pública)', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({ customerName: 'Maria Souza', status: 'SCHEDULED' }),
      );
    });

    it('deve permitir criar agendamento resolvendo a barbearia pelo slug', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      expect(response.status).toBe(201);

      const bySlug = await request(app)
        .post('/api/barbershops/barbearia-central/appointments')
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T15:00:00.000Z'));

      expect(bySlug.status).toBe(201);
    });

    it('deve reutilizar o mesmo cliente para o mesmo telefone', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const first = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      const second = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T15:00:00.000Z'));

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.customerId).toBe(second.body.customerId);
    });

    it('deve retornar 404 quando a barbearia não existe', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/api/barbershops/barbearia-inexistente/appointments')
        .send(appointmentPayload('barbeiro-1', 'servico-1', '2026-08-20T14:00:00.000Z'));

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Barbearia não encontrada' }),
      );
    });

    it('deve retornar 400 quando o serviço não pertence à barbearia', async () => {
      const app = createApp();
      const barbershopA = await createBarbershop(app, 'barbearia-a', 'Barbearia A');
      const barbershopB = await createBarbershop(app, 'barbearia-b', 'Barbearia B');
      const barber = await createBarber(app, barbershopA.id, barbershopA.token);
      const serviceB = await createService(app, barbershopB.id, barbershopB.token);

      const response = await request(app)
        .post(`/api/barbershops/${barbershopA.id}/appointments`)
        .set('Authorization', `Bearer ${barbershopA.token}`)
        .send(appointmentPayload(barber.id, serviceB.id, '2026-08-20T14:00:00.000Z'));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'Serviço não encontrado' }));
    });
  });

  describe('GET /api/barbershops/:barbershopId/appointments', () => {
    it('deve listar os agendamentos do dia', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/appointments?date=2026-08-20`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({ customerName: 'Maria Souza', status: 'SCHEDULED' }),
      );
    });

    it('deve listar todos os agendamentos da barbearia quando não há data', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-todas', 'Barbearia Todas');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-21T15:00:00.000Z'));

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].startDate).toBe('2026-08-20T14:00:00.000Z');
      expect(response.body[1].startDate).toBe('2026-08-21T15:00:00.000Z');
    });
  });

  describe('PATCH /api/barbershops/:barbershopId/appointments/:id/complete e cancel', () => {
    async function createAppointment(app: Application) {
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, '2026-08-20T14:00:00.000Z'));

      expect(response.status).toBe(201);
      return { barbershop, appointment: response.body as { id: string } };
    }

    it('deve concluir um agendamento salvando a nota informada', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/complete`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({
          paidPriceCents: 5800,
          paymentMethod: 'PIX',
          note: 'Corte + pomada',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
          pricePaidCents: 5800,
          paymentMethod: 'PIX',
          note: 'Corte + pomada',
        }),
      );
    });

    it('deve concluir um agendamento cobrando o valor informado', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/complete`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ paidPriceCents: 4500, paymentMethod: 'PIX' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
          pricePaidCents: 4500,
          paymentMethod: 'PIX',
        }),
      );
    });

    it('deve cancelar um agendamento', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ status: 'CANCELLED' }));
    });

    it('deve retornar 400 ao concluir um agendamento já cancelado', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/complete`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 ao agendar operação em agendamento inexistente', async () => {
      const app = createApp();
      const { barbershop } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/inexistente/complete`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Agendamento não encontrado' }),
      );
    });
  });
});
