import { WorkingHours } from '@/domain/entities/WorkingHours';

export interface IWorkingHoursRepository {
  findAll(barbershopId: string): Promise<WorkingHours[]>;
  save(workingHours: WorkingHours): Promise<WorkingHours>;
}
