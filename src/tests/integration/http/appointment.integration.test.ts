import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createApp } from '@/infra/http/express/app';
import { createMemoryRepositorySet } from '@/infra/repositories/factory';
import { Appointment, Customer, Service } from '@/domain/entities';
import { getAccessToken } from '@/tests/helpers/auth';

describe('Appointment HTTP Integration', () => {
  function futureISO(days = 1, hours = 14, minutes = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  function todayISO(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

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
      token: getAccessToken(login),
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
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          barbershopId: barbershop.id,
          barberId: barber.id,
          serviceId: service.id,
          customerName: 'Maria Souza',
          status: 'SCHEDULED',
        }),
      );
      expect(response.body.startDate).toBeDefined();
      expect(response.body.endDate).toBeDefined();
    });

    it('deve retornar 400 quando o barbeiro já tem agendamento no mesmo horário', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const payload = appointmentPayload(barber.id, service.id, futureISO(1, 14));

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

    it('deve retornar 400 quando o telefone do cliente é inválido', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const payload = {
        ...appointmentPayload(barber.id, service.id, futureISO(1, 14)),
        customerPhone: '16871234567',
      };

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Celulares devem começar com 9 após o DDD' }),
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
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 15)));

      expect(response.status).toBe(201);
    });

    it('deve permitir criar agendamento sem autenticação (rota pública)', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

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
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

      expect(response.status).toBe(201);

      const bySlug = await request(app)
        .post('/api/barbershops/barbearia-central/appointments')
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 15)));

      expect(bySlug.status).toBe(201);
    });

    it('deve reutilizar o mesmo cliente para o mesmo telefone', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const first = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

      const second = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 15)));

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.customerId).toBe(second.body.customerId);
    });

    it('deve retornar 404 quando a barbearia não existe', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/api/barbershops/barbearia-inexistente/appointments')
        .send(appointmentPayload('barbeiro-1', 'servico-1', futureISO(1, 14)));

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
        .send(appointmentPayload(barber.id, serviceB.id, futureISO(1, 14)));

      expect(response.status).toBe(404);
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
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/appointments?date=${futureISO(1, 14).slice(0, 10)}`)
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
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

      await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, futureISO(2, 15)));

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].startDate).toBeDefined();
      expect(response.body[1].startDate).toBeDefined();
    });
  });

  describe('GET /api/barbershops/:barbershopId/ai/inactive-clients', () => {
    it('deve listar clientes sem atendimento há mais de 30 dias', async () => {
      const repositories = createMemoryRepositorySet();
      const app = createApp({ repositories });
      const barbershop = await createBarbershop(app, 'barbearia-ia', 'Barbearia IA');

      const service = new Service({
        id: randomUUID(),
        barbershopId: barbershop.id,
        name: 'Corte de cabelo',
        priceCents: 6000,
        durationMinutes: 30,
      });
      await repositories.serviceRepository.save(service);

      const customer = new Customer({
        id: randomUUID(),
        barbershopId: barbershop.id,
        name: 'Pedro Henrique',
        phone: '11987654321',
      });
      await repositories.customerRepository.save(customer);

      const startDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      await repositories.appointmentRepository.save(
        new Appointment({
          id: randomUUID(),
          barbershopId: barbershop.id,
          barberId: randomUUID(),
          serviceId: service.id,
          customerId: customer.id,
          startDate,
          endDate: new Date(startDate.getTime() + 30 * 60 * 1000),
          status: 'COMPLETED',
          pricePaidCents: 6000,
          paymentMethod: 'PIX',
        }),
      );

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/ai/inactive-clients`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          id: customer.id,
          name: 'Pedro Henrique',
          phone: '11987654321',
          lastService: 'Corte de cabelo',
          estimatedLostValueCents: 6000,
          suggestedOffer: 'Corte + barba como cortesia de retorno',
        }),
      );
      expect(response.body[0].lastVisitDays).toBeGreaterThan(30);
    });

    it('deve retornar lista vazia quando não há clientes inativos', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-ia-vazia', 'Barbearia IA Vazia');

      const response = await request(app)
        .get(`/api/barbershops/${barbershop.id}/ai/inactive-clients`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('deve retornar 401 sem token de autenticação', async () => {
      const app = createApp();
      const barbershop = await createBarbershop(app, 'barbearia-ia-401', 'Barbearia IA 401');

      const response = await request(app).get(
        `/api/barbershops/${barbershop.id}/ai/inactive-clients`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/barbershops/:barbershopId/appointments/:id/complete, cancel e confirm', () => {
    async function createAppointment(app: Application) {
      const barbershop = await createBarbershop(app, 'barbearia-central', 'Barbearia Central');
      const barber = await createBarber(app, barbershop.id, barbershop.token);
      const service = await createService(app, barbershop.id, barbershop.token);

      const response = await request(app)
        .post(`/api/barbershops/${barbershop.id}/appointments`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send(appointmentPayload(barber.id, service.id, futureISO(1, 14)));

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

    it('deve confirmar um agendamento', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/confirm`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ status: 'CONFIRMED' }));
    });

    it('deve ser idempotente ao confirmar um agendamento já confirmado', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      const first = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/confirm`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      const second = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/confirm`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.status).toBe('CONFIRMED');
      expect(second.body.status).toBe('CONFIRMED');
    });

    it('deve permitir concluir um agendamento confirmado', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/confirm`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/complete`)
        .set('Authorization', `Bearer ${barbershop.token}`)
        .send({ paidPriceCents: 4000, paymentMethod: 'PIX' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({ status: 'COMPLETED' }));
    });

    it('deve retornar 400 ao confirmar um agendamento já cancelado', async () => {
      const app = createApp();
      const { barbershop, appointment } = await createAppointment(app);

      await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/${appointment.id}/confirm`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({ message: 'appointment canceled' }));
    });

    it('deve retornar 404 ao confirmar um agendamento inexistente', async () => {
      const app = createApp();
      const { barbershop } = await createAppointment(app);

      const response = await request(app)
        .patch(`/api/barbershops/${barbershop.id}/appointments/inexistente/confirm`)
        .set('Authorization', `Bearer ${barbershop.token}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Agendamento não encontrado' }),
      );
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

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({ message: 'Agendamento não encontrado' }),
      );
    });
  });
});
