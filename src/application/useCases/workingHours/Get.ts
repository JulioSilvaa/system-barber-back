import { WorkingHours } from '@/domain/entities/WorkingHours';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';

export default class GetWorkingHoursUseCase {
  constructor(private readonly workingHoursRepository: IWorkingHoursRepository) {}

  async execute(barbershopId: string): Promise<WorkingHours[]> {
    const hours = await this.workingHoursRepository.findAll(barbershopId);

    if (hours.length > 0) {
      return hours;
    }

    return DEFAULT_WORKING_HOURS.map(day => {
      return new WorkingHours({
        id: `default-${day.dayOfWeek}-${barbershopId}`,
        barbershopId,
        dayOfWeek: day.dayOfWeek,
        isOpen: day.isOpen,
        openTime: day.openTime,
        closeTime: day.closeTime,
      });
    });
  }
}

export const DEFAULT_WORKING_HOURS = [
  { dayOfWeek: 0, isOpen: false, openTime: null, closeTime: null },
  { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
];
