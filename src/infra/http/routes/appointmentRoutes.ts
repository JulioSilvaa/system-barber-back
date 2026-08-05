import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import AppointmentController from '../controllers/AppointmentController';
import { requireAuth, requireMembership } from '@/infra/middleware/AuthMiddleware';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

export interface AppointmentRoutesDeps {
  appointmentRepository: IAppointmentRepository;
  serviceRepository: IServiceRepository;
  barbershopRepository: IBarbershopRepository;
  userBarbershopRepository: IUserBarbershopRepository;
}

export default function createAppointmentRoutes(deps?: AppointmentRoutesDeps) {
  const router = Router();

  const appointmentRepository = deps?.appointmentRepository ?? new AppointmentRepositoryMemory();
  const serviceRepository = deps?.serviceRepository ?? new ServiceRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();

  const controller = new AppointmentController(
    appointmentRepository,
    serviceRepository,
    barbershopRepository,
    userBarbershopRepository,
  );

  router.post(
    '/barbershops/:barbershopId/appointments',
    requireAuth,
    requireMembership(userBarbershopRepository),
    ExpressAdapter.create(controller.create),
  );
  router.get(
    '/barbershops/:barbershopId/appointments',
    requireAuth,
    requireMembership(userBarbershopRepository),
    ExpressAdapter.create(controller.listDay),
  );
  router.patch(
    '/barbershops/:barbershopId/appointments/:id/complete',
    requireAuth,
    requireMembership(userBarbershopRepository),
    ExpressAdapter.create(controller.complete),
  );
  router.patch(
    '/barbershops/:barbershopId/appointments/:id/cancel',
    requireAuth,
    requireMembership(userBarbershopRepository),
    ExpressAdapter.create(controller.cancel),
  );

  return router;
}
