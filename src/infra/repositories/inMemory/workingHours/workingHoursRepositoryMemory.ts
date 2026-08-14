import { WorkingHours } from '@/domain/entities/WorkingHours';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';

export default class WorkingHoursRepositoryMemory implements IWorkingHoursRepository {
  private records: WorkingHours[] = [];

  async findAll(barbershopId: string): Promise<WorkingHours[]> {
    return this.records
      .filter(r => r.barbershopId === barbershopId && !r.barberId)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async findByBarber(barbershopId: string, barberId: string): Promise<WorkingHours[]> {
    return this.records
      .filter(r => r.barbershopId === barbershopId && r.barberId === barberId)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async save(workingHours: WorkingHours): Promise<WorkingHours> {
    const existingIndex = this.records.findIndex(
      r =>
        r.barbershopId === workingHours.barbershopId &&
        r.barberId === workingHours.barberId &&
        r.dayOfWeek === workingHours.dayOfWeek,
    );

    if (existingIndex !== -1) {
      this.records[existingIndex] = workingHours;
    } else {
      this.records.push(workingHours);
    }

    return workingHours;
  }
}
