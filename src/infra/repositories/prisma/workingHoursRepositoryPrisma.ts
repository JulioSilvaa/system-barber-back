import { WorkingHours } from '@/domain/entities/WorkingHours';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import type { PrismaClient, WorkingHours as PrismaWorkingHours } from '@/generated/prisma/client';

function toEntity(row: PrismaWorkingHours): WorkingHours {
  return new WorkingHours({
    id: row.id,
    barbershopId: row.barbershopId,
    dayOfWeek: row.dayOfWeek,
    isOpen: row.isOpen,
    openTime: row.openTime,
    closeTime: row.closeTime,
  });
}

export default class WorkingHoursRepositoryPrisma implements IWorkingHoursRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(barbershopId: string): Promise<WorkingHours[]> {
    const rows = await this.prisma.workingHours.findMany({
      where: { barbershopId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return rows.map(toEntity);
  }

  async save(workingHours: WorkingHours): Promise<WorkingHours> {
    const data = {
      barbershopId: workingHours.barbershopId,
      dayOfWeek: workingHours.dayOfWeek,
      isOpen: workingHours.isOpen,
      openTime: workingHours.openTime,
      closeTime: workingHours.closeTime,
    };

    await this.prisma.workingHours.upsert({
      where: {
        barbershopId_dayOfWeek: {
          barbershopId: workingHours.barbershopId,
          dayOfWeek: workingHours.dayOfWeek,
        },
      },
      create: { id: workingHours.id, ...data },
      update: data,
    });

    return workingHours;
  }
}
