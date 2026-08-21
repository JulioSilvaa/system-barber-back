import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  Appointment,
  Barbershop,
  Customer,
  Service,
  User,
  UserBarbershop,
} from '@/domain/entities';
import { createPrismaClient } from '@/infra/database/prisma';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import { createApp } from '@/infra/http/express/app';
import { createPrismaRepositorySet, RepositorySet } from '@/infra/repositories/factory';
import { getAccessToken } from '@/tests/helpers/auth';
import { getTestDatabaseUrl } from '@/tests/database/globalSetup';
import type { PrismaClient } from '@/generated/prisma/client';

describe('Database Integration (PostgreSQL)', { skip: !getTestDatabaseUrl() }, () => {
  let prisma: PrismaClient;
  let repositories: RepositorySet;

  const userProps = {
    name: 'Admin DB',
    email: 'admin-db@example.com',
    phone: '11999999999',
  };

  const hashService = new BcryptHashService();

  async function makeUser(props: { id: string; name: string; email: string; phone?: string }) {
    return new User(props);
  }

  async function makeBarbershop(props: {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone: string;
    password: string;
  }) {
    return new Barbershop({ ...props, password: await hashService.hash(props.password) });
  }

  beforeAll(() => {
    prisma = createPrismaClient(getTestDatabaseUrl()!);
    repositories = createPrismaRepositorySet(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.service.deleteMany();
    await prisma.userBarbershop.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('UserRepository', () => {
    it('deve salvar e buscar um usuário por id e email (case-insensitive)', async () => {
      const user = await makeUser({ id: 'u-1', ...userProps });

      await repositories.userRepository.save(user);

      const byId = await repositories.userRepository.findById('u-1');
      const byEmail = await repositories.userRepository.findByEmail('ADMIN-DB@EXAMPLE.COM');

      expect(byId).not.toBeNull();
      expect(byId?.name).toBe('Admin DB');
      expect(byEmail?.id).toBe('u-1');
    });

    it('deve listar usuários e apagar um usuário', async () => {
      await repositories.userRepository.save(await makeUser({ id: 'u-1', ...userProps }));

      const list = await repositories.userRepository.list();
      expect(list).toHaveLength(1);

      await repositories.userRepository.delete('u-1');
      expect(await repositories.userRepository.findById('u-1')).toBeNull();
    });

    it('deve atualizar um usuário existente (upsert)', async () => {
      await repositories.userRepository.save(await makeUser({ id: 'u-1', ...userProps }));

      const updated = await makeUser({
        id: 'u-1',
        name: 'Admin Renomeado',
        email: 'admin-db@example.com',
        phone: '11999999999',
      });
      await repositories.userRepository.save(updated);

      const found = await repositories.userRepository.findById('u-1');
      expect(found?.name).toBe('Admin Renomeado');
    });
  });

  describe('BarbershopRepository', () => {
    it('deve salvar e buscar uma barbearia por id e slug', async () => {
      const barbershop = await makeBarbershop({
        id: 'b-1',
        name: 'Barbearia DB',
        slug: 'barbearia-db',
        email: 'barbearia-db@example.com',
        phone: '11999999999',
        password: 'SenhaForte1',
      });

      await repositories.barbershopRepository.save(barbershop);

      const byId = await repositories.barbershopRepository.findById('b-1');
      const bySlug = await repositories.barbershopRepository.findBySlug('barbearia-db');

      expect(byId?.name).toBe('Barbearia DB');
      expect(bySlug?.id).toBe('b-1');
    });
  });

  describe('UserBarbershopRepository', () => {
    it('deve salvar um vínculo e listar os vínculos de um usuário', async () => {
      await repositories.userRepository.save(await makeUser({ id: 'u-1', ...userProps }));
      await repositories.barbershopRepository.save(
        await makeBarbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          email: 'barbearia-db@example.com',
          phone: '11999999999',
          password: 'SenhaForte1',
        }),
      );

      const membership = new UserBarbershop({
        id: 'm-1',
        userId: 'u-1',
        barbershopId: 'b-1',
        localRole: 'BARBER',
      });

      await repositories.userBarbershopRepository.save(membership);

      const byUser = await repositories.userBarbershopRepository.findByUserId('u-1');
      expect(byUser).toHaveLength(1);
      expect(byUser[0].isBarber()).toBe(true);

      const byBoth = await repositories.userBarbershopRepository.findByUserAndBarbershop(
        'u-1',
        'b-1',
      );
      expect(byBoth?.id).toBe('m-1');
    });
  });

  describe('ServiceRepository', () => {
    it('deve salvar e listar serviços de uma barbearia', async () => {
      await repositories.barbershopRepository.save(
        await makeBarbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          email: 'barbearia-db@example.com',
          phone: '11999999999',
          password: 'SenhaForte1',
        }),
      );

      const service = new Service({
        id: 's-1',
        barbershopId: 'b-1',
        name: 'Corte',
        priceCents: 3500,
        durationMinutes: 30,
      });

      await repositories.serviceRepository.save(service);

      const byId = await repositories.serviceRepository.findById('s-1', 'b-1');
      const otherBarbershop = await repositories.serviceRepository.findById('s-1', 'b-2');
      const all = await repositories.serviceRepository.findAll('b-1');

      expect(byId?.name).toBe('Corte');
      expect(otherBarbershop).toBeNull();
      expect(all).toHaveLength(1);
    });
  });

  describe('AppointmentRepository', () => {
    it('deve salvar um agendamento e filtrar por barbeiro e dia', async () => {
      await repositories.userRepository.save(await makeUser({ id: 'u-1', ...userProps }));
      await repositories.barbershopRepository.save(
        await makeBarbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          email: 'barbearia-db@example.com',
          phone: '11999999999',
          password: 'SenhaForte1',
        }),
      );
      await repositories.serviceRepository.save(
        new Service({
          id: 's-1',
          barbershopId: 'b-1',
          name: 'Corte',
          priceCents: 3500,
          durationMinutes: 30,
        }),
      );

      await repositories.customerRepository.save(
        new Customer({
          id: 'c-1',
          barbershopId: 'b-1',
          name: 'Cliente',
          phone: '11988888888',
        }),
      );

      const startDate = new Date('2026-08-20T10:00:00.000Z');
      const endDate = new Date('2026-08-20T10:30:00.000Z');

      const appointment = new Appointment({
        id: 'a-1',
        barbershopId: 'b-1',
        barberId: 'u-1',
        serviceId: 's-1',
        customerId: 'c-1',
        startDate,
        endDate,
      });

      await repositories.appointmentRepository.save(appointment);

      const byId = await repositories.appointmentRepository.findById('a-1', 'b-1');
      expect(byId?.customerId).toBe('c-1');

      const sameDay = await repositories.appointmentRepository.findByBarberAndDate(
        'u-1',
        'b-1',
        new Date('2026-08-20T15:00:00.000Z'),
      );
      const otherDay = await repositories.appointmentRepository.findByBarberAndDate(
        'u-1',
        'b-1',
        new Date('2026-08-21T15:00:00.000Z'),
      );

      expect(sameDay).toHaveLength(1);
      expect(otherDay).toHaveLength(0);

      const barbershopSameDay = await repositories.appointmentRepository.findByBarbershopAndDate(
        'b-1',
        new Date('2026-08-20T15:00:00.000Z'),
      );
      const barbershopOtherDay = await repositories.appointmentRepository.findByBarbershopAndDate(
        'b-1',
        new Date('2026-08-21T15:00:00.000Z'),
      );

      expect(barbershopSameDay).toHaveLength(1);
      expect(barbershopOtherDay).toHaveLength(0);

      await repositories.appointmentRepository.save(
        new Appointment({
          id: 'a-2',
          barbershopId: 'b-1',
          barberId: 'u-1',
          serviceId: 's-1',
          customerId: 'c-1',
          startDate: new Date('2026-08-21T09:00:00.000Z'),
          endDate: new Date('2026-08-21T09:30:00.000Z'),
        }),
      );

      await repositories.userRepository.save(
        await makeUser({
          id: 'u-2',
          name: 'Barbeiro Dois',
          email: 'barbeiro-dois@example.com',
          phone: '11900000002',
        }),
      );
      await repositories.barbershopRepository.save(
        await makeBarbershop({
          id: 'b-2',
          name: 'Barbearia Dois',
          slug: 'barbearia-dois',
          email: 'barbearia-dois@example.com',
          phone: '11900000003',
          password: 'SenhaForte1',
        }),
      );
      await repositories.serviceRepository.save(
        new Service({
          id: 's-2',
          barbershopId: 'b-2',
          name: 'Barba',
          priceCents: 1500,
          durationMinutes: 20,
        }),
      );
      await repositories.customerRepository.save(
        new Customer({
          id: 'c-2',
          barbershopId: 'b-2',
          name: 'Cliente Dois',
          phone: '11900000004',
        }),
      );
      await repositories.appointmentRepository.save(
        new Appointment({
          id: 'a-3',
          barbershopId: 'b-2',
          barberId: 'u-2',
          serviceId: 's-2',
          customerId: 'c-2',
          startDate: new Date('2026-08-20T11:00:00.000Z'),
          endDate: new Date('2026-08-20T11:20:00.000Z'),
        }),
      );

      const allB1 = await repositories.appointmentRepository.findAllByBarbershop('b-1');
      const allB2 = await repositories.appointmentRepository.findAllByBarbershop('b-2');

      expect(allB1.map(a => a.id)).toEqual(['a-1', 'a-2']);
      expect(allB2.map(a => a.id)).toEqual(['a-3']);
      expect(allB1.some(a => a.id === 'a-3')).toBe(false);
    });
  });

  describe('CustomerRepository', () => {
    it('deve salvar e buscar clientes de uma barbearia', async () => {
      await repositories.barbershopRepository.save(
        await makeBarbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          email: 'barbearia-db@example.com',
          phone: '11999999999',
          password: 'SenhaForte1',
        }),
      );

      const customer = new Customer({
        id: 'c-1',
        barbershopId: 'b-1',
        name: 'Maria Souza',
        phone: '11988888888',
      });

      await repositories.customerRepository.save(customer);

      const byId = await repositories.customerRepository.findById('c-1', 'b-1');
      const byPhone = await repositories.customerRepository.findByBarbershopAndPhone(
        'b-1',
        '11988888888',
      );
      const otherBarbershop = await repositories.customerRepository.findById('c-1', 'b-2');

      expect(byId?.name).toBe('Maria Souza');
      expect(byPhone?.id).toBe('c-1');
      expect(otherBarbershop).toBeNull();

      const list = await repositories.customerRepository.findByBarbershop('b-1');
      expect(list).toHaveLength(1);
    });

    it('deve garantir unicidade de telefone por barbearia', async () => {
      await repositories.barbershopRepository.save(
        await makeBarbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          email: 'barbearia-db@example.com',
          phone: '11999999999',
          password: 'SenhaForte1',
        }),
      );
      await repositories.barbershopRepository.save(
        await makeBarbershop({
          id: 'b-2',
          name: 'Barbearia Norte',
          slug: 'barbearia-norte',
          email: 'barbearia-norte@example.com',
          phone: '11988888888',
          password: 'SenhaForte1',
        }),
      );

      await repositories.customerRepository.save(
        new Customer({ id: 'c-1', barbershopId: 'b-1', name: 'Maria', phone: '11988888888' }),
      );
      await repositories.customerRepository.save(
        new Customer({ id: 'c-2', barbershopId: 'b-2', name: 'João', phone: '11988888888' }),
      );

      const byPhone = await repositories.customerRepository.findByBarbershopAndPhone(
        'b-2',
        '11988888888',
      );
      expect(byPhone?.id).toBe('c-2');
    });
  });

  describe('Persistência', () => {
    it('deve persistir dados no arquivo entre instâncias do client', async () => {
      const user = await makeUser({ id: 'u-persist', ...userProps });
      await repositories.userRepository.save(user);

      const secondClient = createPrismaClient(getTestDatabaseUrl()!);
      const secondRepos = createPrismaRepositorySet(secondClient);

      const found = await secondRepos.userRepository.findById('u-persist');

      expect(found?.email).toBe('admin-db@example.com');

      await secondClient.$disconnect();
    });
  });

  describe('Fluxo HTTP completo com PostgreSQL', () => {
    it('deve criar barbearia via HTTP (público) e persistir no banco', async () => {
      const app = createApp({ repositories });

      const response = await request(app).post('/api/barbershops').send({
        name: 'Barbearia HTTP',
        slug: 'barbearia-http',
        email: 'barbearia-http@example.com',
        phone: '11999999999',
        password: 'SenhaForte1',
      });

      expect(response.status).toBe(201);

      const persisted = await repositories.barbershopRepository.findBySlug('barbearia-http');
      expect(persisted).not.toBeNull();
      expect(persisted?.isActive).toBe(true);
    });

    it('deve criar serviço e agendamento via HTTP e persistir no banco', async () => {
      const app = createApp({ repositories });

      const createBarbershop = await request(app).post('/api/barbershops').send({
        name: 'Barbearia Flow',
        slug: 'barbearia-flow',
        email: 'barbearia-flow@example.com',
        phone: '11999999999',
        password: 'SenhaForte1',
      });

      expect(createBarbershop.status).toBe(201);
      const barbershopId = createBarbershop.body.id as string;

      const login = await request(app)
        .post('/api/barbershops/login')
        .send({ email: 'barbearia-flow@example.com', password: 'SenhaForte1' });

      expect(login.status).toBe(200);
      const token = getAccessToken(login);

      const createBarber = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Barbeiro Flow',
          email: 'barbeiro-flow@example.com',
          phone: '11977777777',
          password: 'SenhaForte1',
          barbershopId,
        });

      expect(createBarber.status).toBe(201);
      const barberId = createBarber.body.id as string;

      const createService = await request(app)
        .post(`/api/barbershops/${barbershopId}/services`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Corte', priceCents: 3500, durationMinutes: 30 });

      expect(createService.status).toBe(201);
      const serviceId = createService.body.id as string;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      if (futureDate.getDay() === 0) futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(14, 0, 0, 0);
      const startDateISO = futureDate.toISOString();
      const dateQuery = startDateISO.slice(0, 10);

      const createAppointment = await request(app)
        .post(`/api/barbershops/${barbershopId}/appointments`)
        .send({
          barberId,
          serviceId,
          customerName: 'Cliente Flow',
          customerPhone: '11988888888',
          startDate: startDateISO,
        });

      expect(createAppointment.status).toBe(201);
      expect(createAppointment.body.status).toBe('SCHEDULED');

      const listDay = await request(app)
        .get(`/api/barbershops/${barbershopId}/appointments?date=${dateQuery}`)
        .set('Authorization', `Bearer ${token}`);

      expect(listDay.status).toBe(200);
      expect(listDay.body).toHaveLength(1);
      expect(listDay.body[0]).toEqual(
        expect.objectContaining({ customerName: 'Cliente Flow', status: 'SCHEDULED' }),
      );

      const persistedService = await repositories.serviceRepository.findById(
        serviceId,
        barbershopId,
      );
      expect(persistedService?.name).toBe('Corte');

      const persistedAppointment = await repositories.appointmentRepository.findById(
        createAppointment.body.id,
        barbershopId,
      );
      expect(persistedAppointment?.customerId).toBeTruthy();

      const persistedCustomer = await repositories.customerRepository.findByBarbershopAndPhone(
        barbershopId,
        '11988888888',
      );
      expect(persistedCustomer?.name).toBe('Cliente Flow');
    });
  });
});
