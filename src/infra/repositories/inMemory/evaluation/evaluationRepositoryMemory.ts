import { Evaluation } from '@/domain/entities';
import IEvaluationRepository from '@/domain/repository/EvaluationRepository';

export default class EvaluationRepositoryMemory implements IEvaluationRepository {
  private evaluations: Evaluation[] = [];

  async save(evaluation: Evaluation): Promise<Evaluation> {
    const existingIndex = this.evaluations.findIndex(item => item.id === evaluation.id);
    if (existingIndex !== -1) {
      this.evaluations[existingIndex] = evaluation;
    } else {
      this.evaluations.push(evaluation);
    }
    return evaluation;
  }

  async findByAppointment(appointmentId: string): Promise<Evaluation | null> {
    return this.evaluations.find(evaluation => evaluation.appointmentId === appointmentId) ?? null;
  }

  async findByBarbershop(barbershopId: string): Promise<Evaluation[]> {
    return this.evaluations
      .filter(evaluation => evaluation.barbershopId === barbershopId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
