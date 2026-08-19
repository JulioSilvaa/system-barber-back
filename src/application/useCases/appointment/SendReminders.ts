import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { INotificationService } from '@/domain/services/INotificationService';
import { Appointment } from '@/domain/entities/Appointment';

export interface SendRemindersResult {
  sent: number;
  failed: number;
  appointments: string[];
}

export default class SendRemindersUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(barbershopId: string): Promise<SendRemindersResult> {
    const barbershop = await this.barbershopRepository.findById(barbershopId);
    if (!barbershop) {
      return { sent: 0, failed: 0, appointments: [] };
    }

    const hoursBefore = barbershop.reminderHoursBefore ?? 24;
    const now = new Date();
    const horizon = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

    const pendingAppointments = await this.appointmentRepository.findPendingReminders(
      barbershopId,
      horizon,
    );

    let sent = 0;
    let failed = 0;
    const sentIds: string[] = [];

    for (const appointment of pendingAppointments) {
      try {
        await this.sendReminder(barbershop, appointment);
        appointment.markReminderSent();
        await this.appointmentRepository.update(appointment);
        sent++;
        sentIds.push(appointment.id);
      } catch {
        failed++;
      }
    }

    return { sent, failed, appointments: sentIds };
  }

  private async sendReminder(
    barbershop: { id: string; name: string },
    appointment: Appointment,
  ): Promise<void> {
    const dateStr = appointment.startDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = appointment.startDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.notificationService.sendToBarbershop(barbershop.id, {
      title: `Lembrete: Agendamento amanhã`,
      body: `Você tem um agendamento em ${barbershop.name} em ${dateStr} às ${timeStr}.`,
      url: `/admin/agenda`,
    });
  }
}
