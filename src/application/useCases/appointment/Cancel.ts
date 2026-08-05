import { Appointment } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';

export default class CancelAppointmentUseCase {
  constructor(private readonly appointmentRepository: IAppointmentRepository) {}

  async execute(appointmentId: string, barbershopId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(appointmentId, barbershopId);
    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }

    appointment.cancel();
    return this.appointmentRepository.update(appointment);
  }
}
