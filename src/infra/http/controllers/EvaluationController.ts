import { NextFunction, Request, Response } from 'express';

import CreateEvaluationUseCase, {
  GetEvaluationStatusUseCase,
} from '@/application/useCases/finance/CreateEvaluation';
import { Evaluation } from '@/domain/entities';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import IEvaluationRepository from '@/domain/repository/EvaluationRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import EvaluationRepositoryMemory from '@/infra/repositories/inMemory/evaluation/evaluationRepositoryMemory';

export default class EvaluationController {
  private readonly createEvaluationUseCase: CreateEvaluationUseCase;
  private readonly getEvaluationStatusUseCase: GetEvaluationStatusUseCase;
  private readonly evaluationRepository: IEvaluationRepository;

  constructor(
    evaluationRepository: IEvaluationRepository = new EvaluationRepositoryMemory(),
    appointmentRepository: IAppointmentRepository = new AppointmentRepositoryMemory(),
  ) {
    this.evaluationRepository = evaluationRepository;
    this.createEvaluationUseCase = new CreateEvaluationUseCase(
      evaluationRepository,
      appointmentRepository,
    );
    this.getEvaluationStatusUseCase = new GetEvaluationStatusUseCase(
      evaluationRepository,
      appointmentRepository,
    );
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = this.barbershopId(req);
      const evaluation = await this.createEvaluationUseCase.execute({
        barbershopId,
        appointmentId: req.body?.appointmentId,
        rating: Number(req.body?.rating),
        comment: req.body?.comment,
      });

      return res.status(201).json(toEvaluationOutput(evaluation));
    } catch (error) {
      next(error);
    }
  };

  status = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = this.barbershopId(req);
      const rawId = req.params.appointmentId;
      const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId;

      const status = await this.getEvaluationStatusUseCase.execute(barbershopId, appointmentId);
      return res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = this.barbershopId(req);

      const evaluations = await this.evaluationRepository.findByBarbershop(barbershopId);
      return res.status(200).json(evaluations.map(toEvaluationOutput));
    } catch (error) {
      next(error);
    }
  };

  private barbershopId(req: Request): string {
    if (req.barbershopId) return req.barbershopId;
    const raw = req.params.identifier ?? req.params.barbershopId;
    return Array.isArray(raw) ? raw[0] : raw;
  }
}

function toEvaluationOutput(evaluation: Evaluation) {
  return {
    id: evaluation.id,
    barbershopId: evaluation.barbershopId,
    appointmentId: evaluation.appointmentId,
    barberId: evaluation.barberId,
    rating: evaluation.rating,
    comment: evaluation.comment,
    createdAt: evaluation.createdAt,
  };
}
