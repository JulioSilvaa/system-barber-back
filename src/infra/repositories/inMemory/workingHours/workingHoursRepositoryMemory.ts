import { WorkingHours } from '@/domain/entities/WorkingHours';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';

export default class WorkingHoursRepositoryMemory implements IWorkingHoursRepository {
  private records: WorkingHours[] = [];

  async findAll(barbershopId: string): Promise<WorkingHours[]> {
    return this.records.filter(r => r.barbershopId === barbershopId);
  }

  async save(workingHours: WorkingHours): Promise<WorkingHours> {
    const existingIndex = this.records.findIndex(
      r => r.barbershopId === workingHours.barbershopId && r.dayOfWeek === workingHours.dayOfWeek,
    );

    if (existingIndex !== -1) {
      this.records[existingIndex] = workingHours;
    } else {
      this.records.push(workingHours);
    }

    return workingHours;
  }
}
