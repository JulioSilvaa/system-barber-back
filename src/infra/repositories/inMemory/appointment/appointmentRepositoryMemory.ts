import { Appointment } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';

export default class AppointmentRepositoryMemory implements IAppointmentRepository {
  private appointments: Appointment[] = [];

  async findById(id: string, barbershopId: string): Promise<Appointment | null> {
    return (
      this.appointments.find(
        appointment => appointment.id === id && appointment.barbershopId === barbershopId,
      ) ?? null
    );
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

    return this.appointments.filter(
      appointment =>
        appointment.barberId === barberId &&
        appointment.barbershopId === barbershopId &&
        appointment.startDate >= startOfDay &&
        appointment.startDate < endOfDay,
    );
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const existingIndex = this.appointments.findIndex(item => item.id === appointment.id);

    if (existingIndex !== -1) {
      this.appointments[existingIndex] = appointment;
    } else {
      this.appointments.push(appointment);
    }

    return appointment;
  }

  async update(appointment: Appointment): Promise<Appointment> {
    return this.save(appointment);
  }
}
