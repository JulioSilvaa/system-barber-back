import { WorkingHours } from '@/domain/entities/WorkingHours';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import type { PrismaClient, WorkingHours as PrismaWorkingHours } from '@/generated/prisma/client';

function toEntity(row: PrismaWorkingHours): WorkingHours {
  return new WorkingHours({
    id: row.id,
    barbershopId: row.barbershopId,
    barberId: row.barberId,
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
      where: { barbershopId, barberId: null },
      orderBy: { dayOfWeek: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findByBarber(barbershopId: string, barberId: string): Promise<WorkingHours[]> {
    const rows = await this.prisma.workingHours.findMany({
      where: { barbershopId, barberId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return rows.map(toEntity);
  }

  async save(workingHours: WorkingHours): Promise<WorkingHours> {
    const data = {
      barbershopId: workingHours.barbershopId,
      barberId: workingHours.barberId,
      dayOfWeek: workingHours.dayOfWeek,
      isOpen: workingHours.isOpen,
      openTime: workingHours.openTime,
      closeTime: workingHours.closeTime,
    };

    if (workingHours.barberId) {
      await this.prisma.workingHours.upsert({
        where: {
          barbershopId_barberId_dayOfWeek: {
            barbershopId: workingHours.barbershopId,
            barberId: workingHours.barberId,
            dayOfWeek: workingHours.dayOfWeek,
          },
        },
        create: { id: workingHours.id, ...data },
        update: {
          isOpen: workingHours.isOpen,
          openTime: workingHours.openTime,
          closeTime: workingHours.closeTime,
        },
      });
    } else {
      await this.prisma.workingHours.upsert({
        where: {
          barbershopId_dayOfWeek: {
            barbershopId: workingHours.barbershopId,
            dayOfWeek: workingHours.dayOfWeek,
          },
        },
        create: { id: workingHours.id, ...data },
        update: {
          isOpen: workingHours.isOpen,
          openTime: workingHours.openTime,
          closeTime: workingHours.closeTime,
        },
      });
    }

    return workingHours;
  }
}
