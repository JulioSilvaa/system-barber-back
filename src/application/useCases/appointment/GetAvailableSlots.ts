import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import {
  resolveWorkingHours,
  timeToMinutes,
} from '@/application/useCases/appointment/workingHours';

export type AvailableSlotsInputDTO = {
  barbershopId: string;
  date: Date;
  serviceId: string;
  barberId?: string | null;
};

export type AvailableSlot = {
  time: string;
  startDate: Date;
  endDate: Date;
};

export default class GetAvailableSlotsUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly serviceRepository: IServiceRepository,
    private readonly workingHoursRepository: IWorkingHoursRepository,
  ) {}

  async execute(input: AvailableSlotsInputDTO): Promise<AvailableSlot[]> {
    const service = await this.serviceRepository.findById(input.serviceId, input.barbershopId);
    if (!service || !service.isActive) {
      throw new Error('Serviço não encontrado');
    }

    const duration = service.durationMinutes;
    const workingHours = await resolveWorkingHours(
      this.workingHoursRepository,
      input.barbershopId,
      input.barberId,
    );
    const dayHours = workingHours.find(wh => wh.dayOfWeek === input.date.getDay());

    let startMinute = timeToMinutes(DEFAULT_OPEN_TIME);
    let endMinute = timeToMinutes(DEFAULT_CLOSE_TIME);
    if (dayHours) {
      if (!dayHours.isOpen || !dayHours.openTime || !dayHours.closeTime) {
        return [];
      }
      startMinute = timeToMinutes(dayHours.openTime);
      endMinute = timeToMinutes(dayHours.closeTime);
    }

    const step = Math.max(30, Math.ceil(duration / 30) * 30);
    const appointments = await this.appointmentRepository.findByBarbershopAndDate(
      input.barbershopId,
      input.date,
    );

    const busy = appointments.filter(
      appointment =>
        appointment.status === 'SCHEDULED' &&
        (!input.barberId || appointment.barberId === input.barberId),
    );

    const isToday = isSameDay(input.date, new Date());
    const now = new Date();
    const slots: AvailableSlot[] = [];

    for (let minute = startMinute; minute + duration <= endMinute; minute += step) {
      const startDate = new Date(
        input.date.getFullYear(),
        input.date.getMonth(),
        input.date.getDate(),
        Math.floor(minute / 60),
        minute % 60,
        0,
        0,
      );
      const endDate = new Date(startDate.getTime() + duration * 60000);

      if (isToday && startDate.getTime() <= now.getTime()) {
        continue;
      }

      const conflicts = busy.some(
        appointment => startDate < appointment.endDate && endDate > appointment.startDate,
      );
      if (conflicts) {
        continue;
      }

      slots.push({
        time: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
        startDate,
        endDate,
      });
    }

    return slots;
  }
}

const DEFAULT_OPEN_TIME = '09:00';
const DEFAULT_CLOSE_TIME = '17:00';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
