import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';

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

const DEFAULT_OPEN_MINUTES_PER_DAY = 480;
const DEFAULT_START_MINUTE = 9 * 60;
const DEFAULT_END_MINUTE = DEFAULT_START_MINUTE + DEFAULT_OPEN_MINUTES_PER_DAY;

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
    const workingHours = await this.resolveWorkingHours(input.barbershopId, input.barberId);
    const dayHours = workingHours.find(wh => wh.dayOfWeek === input.date.getDay());

    let startMinute = DEFAULT_START_MINUTE;
    let endMinute = DEFAULT_END_MINUTE;
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

  private async resolveWorkingHours(
    barbershopId: string,
    barberId?: string | null,
  ): Promise<
    { dayOfWeek: number; isOpen: boolean; openTime: string | null; closeTime: string | null }[]
  > {
    if (barberId) {
      const barberHours = await this.workingHoursRepository.findByBarber(barbershopId, barberId);
      if (barberHours.length > 0) {
        return barberHours;
      }
    }

    const hours = await this.workingHoursRepository.findAll(barbershopId);
    if (hours.length > 0) {
      return hours;
    }

    return DEFAULT_WORKING_HOURS;
  }
}

const DEFAULT_WORKING_HOURS = [
  { dayOfWeek: 0, isOpen: false, openTime: null, closeTime: null },
  { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
];

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
