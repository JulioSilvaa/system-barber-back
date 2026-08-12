import { Evaluation } from '@/domain/entities';
import IEvaluationRepository from '@/domain/repository/EvaluationRepository';
import type { Evaluation as PrismaEvaluation, PrismaClient } from '@/generated/prisma/client';

function toEvaluationEntity(row: PrismaEvaluation): Evaluation {
  return new Evaluation({
    id: row.id,
    barbershopId: row.barbershopId,
    appointmentId: row.appointmentId,
    barberId: row.barberId,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt,
  });
}

export class EvaluationRepositoryPrisma implements IEvaluationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(evaluation: Evaluation): Promise<Evaluation> {
    await this.prisma.evaluation.create({
      data: {
        id: evaluation.id,
        barbershopId: evaluation.barbershopId,
        appointmentId: evaluation.appointmentId,
        barberId: evaluation.barberId,
        rating: evaluation.rating,
        comment: evaluation.comment,
      },
    });
    return evaluation;
  }

  async findByAppointment(appointmentId: string): Promise<Evaluation | null> {
    const row = await this.prisma.evaluation.findUnique({ where: { appointmentId } });
    return row ? toEvaluationEntity(row) : null;
  }

  async findByBarbershop(barbershopId: string): Promise<Evaluation[]> {
    const rows = await this.prisma.evaluation.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEvaluationEntity);
  }
}
