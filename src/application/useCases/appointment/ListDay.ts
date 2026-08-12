import { Appointment } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';

export default class ListDayAppointmentsUseCase {
  constructor(private readonly appointmentRepository: IAppointmentRepository) {}

  async execute(barbershopId: string, date: Date | null): Promise<Appointment[]> {
    if (!date) {
      return this.appointmentRepository.findAllByBarbershop(barbershopId);
    }

    return this.appointmentRepository.findByBarbershopAndDate(barbershopId, date);
  }
}
