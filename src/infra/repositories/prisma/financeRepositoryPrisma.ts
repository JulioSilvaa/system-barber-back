import ICommissionRepository from '@/domain/repository/CommissionRepository';
import type { Commission as PrismaCommission, PrismaClient } from '@/generated/prisma/client';
import Commission from '@/domain/entities/Commission';

function toCommissionEntity(row: PrismaCommission): Commission {
  return new Commission({
    id: row.id,
    barbershopId: row.barbershopId,
    barberId: row.barberId,
    appointmentId: row.appointmentId,
    serviceValueCents: row.serviceValueCents,
    commissionCents: row.commissionCents,
    rate: row.rate,
    isPaid: row.isPaid,
    createdAt: row.createdAt,
  });
}

export class CommissionRepositoryPrisma implements ICommissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(commission: Commission): Promise<Commission> {
    await this.prisma.commission.upsert({
      where: { id: commission.id },
      create: {
        id: commission.id,
        barbershopId: commission.barbershopId,
        barberId: commission.barberId,
        appointmentId: commission.appointmentId,
        serviceValueCents: commission.serviceValueCents,
        commissionCents: commission.commissionCents,
        rate: commission.rate,
        isPaid: commission.isPaid,
      },
      update: {
        serviceValueCents: commission.serviceValueCents,
        commissionCents: commission.commissionCents,
        rate: commission.rate,
        isPaid: commission.isPaid,
      },
    });
    return commission;
  }

  async findByBarbershop(barbershopId: string): Promise<Commission[]> {
    const rows = await this.prisma.commission.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCommissionEntity);
  }

  async findByAppointment(appointmentId: string, barbershopId: string): Promise<Commission | null> {
    const row = await this.prisma.commission.findFirst({
      where: { appointmentId, barbershopId },
    });
    return row ? toCommissionEntity(row) : null;
  }
}
