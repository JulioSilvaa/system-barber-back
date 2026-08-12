import { Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import EvaluationController from '../controllers/EvaluationController';
import {
  requireAuth,
  requireMembership,
  resolveBarbershop,
} from '@/infra/middleware/AuthMiddleware';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import IEvaluationRepository from '@/domain/repository/EvaluationRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import EvaluationRepositoryMemory from '@/infra/repositories/inMemory/evaluation/evaluationRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

export interface EvaluationRoutesDeps {
  evaluationRepository: IEvaluationRepository;
  appointmentRepository: IAppointmentRepository;
  userBarbershopRepository: IUserBarbershopRepository;
  barbershopRepository: IBarbershopRepository;
}

export default function createEvaluationRoutes(deps?: EvaluationRoutesDeps) {
  const router = Router();

  const evaluationRepository = deps?.evaluationRepository ?? new EvaluationRepositoryMemory();
  const appointmentRepository = deps?.appointmentRepository ?? new AppointmentRepositoryMemory();
  const userBarbershopRepository =
    deps?.userBarbershopRepository ?? new UserBarbershopRepositoryMemory();
  const barbershopRepository = deps?.barbershopRepository ?? new BarbershopRepositoryMemory();

  const controller = new EvaluationController(evaluationRepository, appointmentRepository);

  router.post(
    '/barbershops/:identifier/evaluations',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.create),
  );
  router.get(
    '/barbershops/:identifier/evaluations/:appointmentId/status',
    resolveBarbershop(barbershopRepository),
    ExpressAdapter.create(controller.status),
  );
  router.get(
    '/barbershops/:barbershopId/evaluations',
    requireAuth,
    requireMembership(userBarbershopRepository, barbershopRepository),
    ExpressAdapter.create(controller.list),
  );

  return router;
}
