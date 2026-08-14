import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';

export type WorkingHoursShape = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export const DEFAULT_WORKING_HOURS: WorkingHoursShape[] = [
  { dayOfWeek: 0, isOpen: false, openTime: null, closeTime: null },
  { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '19:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
];

export async function resolveWorkingHours(
  repository: IWorkingHoursRepository,
  barbershopId: string,
  barberId?: string | null,
): Promise<WorkingHoursShape[]> {
  if (barberId) {
    const barberHours = await repository.findByBarber(barbershopId, barberId);
    if (barberHours.length > 0) {
      return barberHours;
    }
  }

  const hours = await repository.findAll(barbershopId);
  if (hours.length > 0) {
    return hours;
  }

  return DEFAULT_WORKING_HOURS;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
