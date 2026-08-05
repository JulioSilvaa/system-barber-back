import { Appointment } from '@/domain/entities/Appointment';
import { AppointmentStatus } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import type { Appointment as PrismaAppointment, PrismaClient } from '@/generated/prisma/client';

function toEntity(row: PrismaAppointment): Appointment {
  return new Appointment({
    id: row.id,
    barbershopId: row.barbershopId,
    barberId: row.barberId,
    serviceId: row.serviceId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status as AppointmentStatus,
  });
}

export default class AppointmentRepositoryPrisma implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, barbershopId: string): Promise<Appointment | null> {
    const row = await this.prisma.appointment.findFirst({
      where: { id, barbershopId },
    });
    return row ? toEntity(row) : null;
  }

  async findByBarberAndDate(
    barberId: string,
    barbershopId: string,
    date: Date,
  ): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await this.prisma.appointment.findMany({
      where: {
        barberId,
        barbershopId,
        startDate: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { startDate: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findByBarbershopAndDate(barbershopId: string, date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await this.prisma.appointment.findMany({
      where: {
        barbershopId,
        startDate: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { startDate: 'asc' },
    });
    return rows.map(toEntity);
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const data = {
      id: appointment.id,
      barbershopId: appointment.barbershopId,
      barberId: appointment.barberId,
      serviceId: appointment.serviceId,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      status: appointment.status,
    };

    await this.prisma.appointment.upsert({
      where: { id: appointment.id },
      create: data,
      update: data,
    });

    return appointment;
  }

  async update(appointment: Appointment): Promise<Appointment> {
    return this.save(appointment);
  }
}
