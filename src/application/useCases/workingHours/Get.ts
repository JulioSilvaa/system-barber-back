import { WorkingHours } from '@/domain/entities/WorkingHours';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import { DEFAULT_WORKING_HOURS } from '@/application/useCases/appointment/workingHours';

export default class GetWorkingHoursUseCase {
  constructor(private readonly workingHoursRepository: IWorkingHoursRepository) {}

  async execute(barbershopId: string, barberId?: string | null): Promise<WorkingHours[]> {
    if (barberId) {
      return this.workingHoursRepository.findByBarber(barbershopId, barberId);
    }

    const hours = await this.workingHoursRepository.findAll(barbershopId);

    if (hours.length > 0) {
      return hours;
    }

    return DEFAULT_WORKING_HOURS.map(day => {
      return new WorkingHours({
        id: `default-${day.dayOfWeek}-${barbershopId}`,
        barbershopId,
        barberId: barberId ?? null,
        dayOfWeek: day.dayOfWeek,
        isOpen: day.isOpen,
        openTime: day.openTime,
        closeTime: day.closeTime,
      });
    });
  }
}
