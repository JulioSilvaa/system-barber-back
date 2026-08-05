import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Appointment, Barbershop, Service, User, UserBarbershop } from '@/domain/entities';
import { createPrismaClient } from '@/infra/database/prisma';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import { createApp } from '@/infra/http/express/app';
import { createPrismaRepositorySet, RepositorySet } from '@/infra/repositories/factory';
import { TEST_DATABASE_URL } from '@/tests/database/globalSetup';
import type { PrismaClient } from '@/generated/prisma/client';

describe('Database Integration (SQLite)', () => {
  let prisma: PrismaClient;
  let repositories: RepositorySet;

  const adminProps = {
    name: 'Admin DB',
    email: 'admin-db@example.com',
    phone: '11999999999',
    password: 'SenhaForte123',
  };

  beforeAll(() => {
    prisma = createPrismaClient(TEST_DATABASE_URL);
    repositories = createPrismaRepositorySet(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.service.deleteMany();
    await prisma.userBarbershop.deleteMany();
    await prisma.barbershop.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('UserRepository', () => {
    it('deve salvar e buscar um usuário por id e email (case-insensitive)', async () => {
      const user = new User({ id: 'u-1', ...adminProps });

      await repositories.userRepository.save(user);

      const byId = await repositories.userRepository.findById('u-1');
      const byEmail = await repositories.userRepository.findByEmail('ADMIN-DB@EXAMPLE.COM');

      expect(byId).not.toBeNull();
      expect(byId?.name).toBe('Admin DB');
      expect(byEmail?.id).toBe('u-1');
      expect(byEmail?.globalRole).toBe('USER');
    });

    it('deve listar usuários e apagar um usuário', async () => {
      await repositories.userRepository.save(new User({ id: 'u-1', ...adminProps }));

      const list = await repositories.userRepository.list();
      expect(list).toHaveLength(1);

      await repositories.userRepository.delete('u-1');
      expect(await repositories.userRepository.findById('u-1')).toBeNull();
    });

    it('deve atualizar um usuário existente (upsert)', async () => {
      await repositories.userRepository.save(new User({ id: 'u-1', ...adminProps }));

      const updated = new User({
        id: 'u-1',
        name: 'Admin Renomeado',
        email: 'admin-db@example.com',
        phone: '11999999999',
        password: 'SenhaForte123',
        globalRole: 'SUPER_ADMIN',
      });
      await repositories.userRepository.save(updated);

      const found = await repositories.userRepository.findById('u-1');
      expect(found?.name).toBe('Admin Renomeado');
      expect(found?.globalRole).toBe('SUPER_ADMIN');
    });
  });

  describe('BarbershopRepository', () => {
    it('deve salvar e buscar uma barbearia por id e slug', async () => {
      const barbershop = new Barbershop({
        id: 'b-1',
        name: 'Barbearia DB',
        slug: 'barbearia-db',
        phone: '11999999999',
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
      await repositories.userRepository.save(new User({ id: 'u-1', ...adminProps }));
      await repositories.barbershopRepository.save(
        new Barbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          phone: '11999999999',
        }),
      );

      const membership = new UserBarbershop({
        id: 'm-1',
        userId: 'u-1',
        barbershopId: 'b-1',
        localRole: 'OWNER',
      });

      await repositories.userBarbershopRepository.save(membership);

      const byUser = await repositories.userBarbershopRepository.findByUserId('u-1');
      expect(byUser).toHaveLength(1);
      expect(byUser[0].isOwner()).toBe(true);

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
        new Barbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          phone: '11999999999',
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
      await repositories.userRepository.save(new User({ id: 'u-1', ...adminProps }));
      await repositories.barbershopRepository.save(
        new Barbershop({
          id: 'b-1',
          name: 'Barbearia DB',
          slug: 'barbearia-db',
          phone: '11999999999',
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

      const startDate = new Date('2026-08-10T10:00:00.000Z');
      const endDate = new Date('2026-08-10T10:30:00.000Z');

      const appointment = new Appointment({
        id: 'a-1',
        barbershopId: 'b-1',
        barberId: 'u-1',
        serviceId: 's-1',
        customerName: 'Cliente',
        customerPhone: '11988888888',
        startDate,
        endDate,
      });

      await repositories.appointmentRepository.save(appointment);

      const byId = await repositories.appointmentRepository.findById('a-1', 'b-1');
      expect(byId?.customerName).toBe('Cliente');

      const sameDay = await repositories.appointmentRepository.findByBarberAndDate(
        'u-1',
        'b-1',
        new Date('2026-08-10T15:00:00.000Z'),
      );
      const otherDay = await repositories.appointmentRepository.findByBarberAndDate(
        'u-1',
        'b-1',
        new Date('2026-08-11T15:00:00.000Z'),
      );

      expect(sameDay).toHaveLength(1);
      expect(otherDay).toHaveLength(0);

      const barbershopSameDay = await repositories.appointmentRepository.findByBarbershopAndDate(
        'b-1',
        new Date('2026-08-10T15:00:00.000Z'),
      );
      const barbershopOtherDay = await repositories.appointmentRepository.findByBarbershopAndDate(
        'b-1',
        new Date('2026-08-11T15:00:00.000Z'),
      );

      expect(barbershopSameDay).toHaveLength(1);
      expect(barbershopOtherDay).toHaveLength(0);
    });
  });

  describe('Persistência', () => {
    it('deve persistir dados no arquivo entre instâncias do client', async () => {
      const user = new User({ id: 'u-persist', ...adminProps });
      await repositories.userRepository.save(user);

      const secondClient = createPrismaClient(TEST_DATABASE_URL);
      const secondRepos = createPrismaRepositorySet(secondClient);

      const found = await secondRepos.userRepository.findById('u-persist');

      expect(found?.email).toBe('admin-db@example.com');

      await secondClient.$disconnect();
    });
  });

  describe('Fluxo HTTP completo com SQLite', () => {
    it('deve criar barbearia via HTTP e persistir no banco', async () => {
      const tokenService = new JwtTokenService();

      await repositories.userRepository.save(new User({ id: 'admin-1', ...adminProps }));

      const app = createApp({ repositories });

      const token = tokenService.sign({ sub: 'admin-1', globalRole: 'SUPER_ADMIN' }, '30m');

      const response = await request(app)
        .post('/api/barbershops')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Barbearia HTTP', slug: 'barbearia-http', phone: '11999999999' });

      expect(response.status).toBe(201);

      const persisted = await repositories.barbershopRepository.findBySlug('barbearia-http');
      expect(persisted).not.toBeNull();

      const membership = await repositories.userBarbershopRepository.findByUserId('admin-1');
      expect(membership).toHaveLength(1);
      expect(membership[0].isOwner()).toBe(true);
    });

    it('deve criar serviço e agendamento via HTTP e persistir no banco', async () => {
      const tokenService = new JwtTokenService();

      await repositories.userRepository.save(new User({ id: 'owner-1', ...adminProps }));
      await repositories.barbershopRepository.save(
        new Barbershop({
          id: 'b-flow',
          name: 'Barbearia Flow',
          slug: 'barbearia-flow',
          phone: '11999999999',
        }),
      );
      await repositories.userBarbershopRepository.save(
        new UserBarbershop({
          id: 'm-flow',
          userId: 'owner-1',
          barbershopId: 'b-flow',
          localRole: 'OWNER',
        }),
      );

      const app = createApp({ repositories });
      const token = tokenService.sign({ sub: 'owner-1', globalRole: 'USER' }, '30m');

      const createService = await request(app)
        .post('/api/barbershops/b-flow/services')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Corte', priceCents: 3500, durationMinutes: 30 });

      expect(createService.status).toBe(201);
      const serviceId = createService.body.id as string;

      const createAppointment = await request(app)
        .post('/api/barbershops/b-flow/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          barberId: 'owner-1',
          serviceId,
          customerName: 'Cliente Flow',
          customerPhone: '11988888888',
          startDate: '2026-08-10T14:00:00.000Z',
        });

      expect(createAppointment.status).toBe(201);
      expect(createAppointment.body.status).toBe('SCHEDULED');

      const listDay = await request(app)
        .get('/api/barbershops/b-flow/appointments?date=2026-08-10')
        .set('Authorization', `Bearer ${token}`);

      expect(listDay.status).toBe(200);
      expect(listDay.body).toHaveLength(1);
      expect(listDay.body[0]).toEqual(
        expect.objectContaining({ customerName: 'Cliente Flow', status: 'SCHEDULED' }),
      );

      const persistedService = await repositories.serviceRepository.findById(serviceId, 'b-flow');
      expect(persistedService?.name).toBe('Corte');

      const persistedAppointment = await repositories.appointmentRepository.findById(
        createAppointment.body.id,
        'b-flow',
      );
      expect(persistedAppointment?.customerName).toBe('Cliente Flow');
    });
  });
});
