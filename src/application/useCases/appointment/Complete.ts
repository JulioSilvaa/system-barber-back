import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Appointment } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';

export default class CompleteAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(
    appointmentId: string,
    barbershopId: string,
    auditCtx?: AuditContext,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(appointmentId, barbershopId);
    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }

    const before = { id: appointment.id, status: appointment.status };
    appointment.complete();
    const saved = await this.appointmentRepository.update(appointment);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId,
      action: 'COMPLETE',
      entityType: 'APPOINTMENT',
      entityId: saved.id,
      before,
      after: { id: saved.id, status: saved.status },
    });

    return saved;
  }
}
