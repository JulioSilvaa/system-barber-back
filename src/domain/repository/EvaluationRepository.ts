import { Evaluation } from '@/domain/entities';

export interface IEvaluationRepository {
  save(evaluation: Evaluation): Promise<Evaluation>;
  findByAppointment(appointmentId: string): Promise<Evaluation | null>;
  findByBarbershop(barbershopId: string): Promise<Evaluation[]>;
}

export default IEvaluationRepository;
