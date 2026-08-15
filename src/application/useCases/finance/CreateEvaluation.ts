import { randomUUID } from 'node:crypto';

import { Evaluation } from '@/domain/entities';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import IEvaluationRepository from '@/domain/repository/EvaluationRepository';
import { AppError, ValidationError, NotFoundError } from '@/domain/errors';

export type CreateEvaluationInputDTO = {
  barbershopId: string;
  appointmentId: string;
  rating: number;
  comment?: string | null;
};

export default class CreateEvaluationUseCase {
  constructor(
    private readonly evaluationRepository: IEvaluationRepository,
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(input: CreateEvaluationInputDTO): Promise<Evaluation> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.barbershopId,
    );
    if (!appointment) {
      throw new NotFoundError('Agendamento não encontrado');
    }

    if (appointment.status !== 'COMPLETED') {
      throw new ValidationError('Apenas atendimentos concluídos podem ser avaliados');
    }

    const existing = await this.evaluationRepository.findByAppointment(input.appointmentId);
    if (existing) {
      throw new AppError('Este atendimento já foi avaliado', 'EVALUATION_ALREADY_EXISTS');
    }

    const evaluation = new Evaluation({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      appointmentId: input.appointmentId,
      barberId: appointment.barberId,
      rating: input.rating,
      comment: input.comment ?? null,
    });

    return this.evaluationRepository.save(evaluation);
  }
}

export type EvaluationStatusDTO = {
  canEvaluate: boolean;
  alreadyEvaluated: boolean;
};

export class GetEvaluationStatusUseCase {
  constructor(
    private readonly evaluationRepository: IEvaluationRepository,
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(barbershopId: string, appointmentId: string): Promise<EvaluationStatusDTO> {
    const appointment = await this.appointmentRepository.findById(appointmentId, barbershopId);
    const existing = await this.evaluationRepository.findByAppointment(appointmentId);

    return {
      canEvaluate: Boolean(appointment && appointment.status === 'COMPLETED' && !existing),
      alreadyEvaluated: Boolean(existing),
    };
  }
}
