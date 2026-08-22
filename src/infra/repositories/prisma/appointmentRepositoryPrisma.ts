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
    customerId: row.customerId,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status as AppointmentStatus,
    pricePaidCents: row.pricePaidCents,
    paymentMethod: row.paymentMethod as Appointment['paymentMethod'],
    note: row.note,
    reminderSent: row.reminderSent,
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

  async findAllByBarbershop(barbershopId: string): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: { barbershopId },
      orderBy: { startDate: 'asc' },
    });
    return rows.map(toEntity);
  }

  async findPendingReminders(barbershopId: string, horizon: Date): Promise<Appointment[]> {
    const now = new Date();
    const rows = await this.prisma.appointment.findMany({
      where: {
        barbershopId,
        status: { in: ['SCHEDULED'] },
        reminderSent: false,
        startDate: { gt: now, lte: horizon },
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
      customerId: appointment.customerId,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      status: appointment.status,
      pricePaidCents: appointment.pricePaidCents,
      paymentMethod: appointment.paymentMethod,
      note: appointment.note,
      reminderSent: appointment.reminderSent,
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
