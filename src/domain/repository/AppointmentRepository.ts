import { Appointment } from '@/domain/entities/Appointment';

export interface IAppointmentRepository {
  findById(id: string, barbershopId: string): Promise<Appointment | null>;
  findByBarberAndDate(barberId: string, barbershopId: string, date: Date): Promise<Appointment[]>;
  findByBarbershopAndDate(barbershopId: string, date: Date): Promise<Appointment[]>;
  findAllByBarbershop(barbershopId: string): Promise<Appointment[]>;
  findPendingReminders(barbershopId: string, horizon: Date): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<Appointment>;
  update(appointment: Appointment): Promise<Appointment>;
}
