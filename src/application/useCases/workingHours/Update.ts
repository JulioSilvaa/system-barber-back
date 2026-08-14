import { randomUUID } from 'node:crypto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { WorkingHours } from '@/domain/entities/WorkingHours';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type DayScheduleInput = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string | null;
  closeTime?: string | null;
};

export type UpdateWorkingHoursInputDTO = {
  barbershopId: string;
  barberId?: string | null;
  days: DayScheduleInput[];
};

export default class UpdateWorkingHoursUseCase {
  constructor(
    private readonly workingHoursRepository: IWorkingHoursRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(
    input: UpdateWorkingHoursInputDTO,
    auditCtx?: AuditContext,
  ): Promise<WorkingHours[]> {
    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    if (!input.days || input.days.length === 0) {
      throw new Error('É necessário informar ao menos um dia');
    }

    const saved: WorkingHours[] = [];
    for (const day of input.days) {
      const workingHours = new WorkingHours({
        id: randomUUID(),
        barbershopId: input.barbershopId,
        barberId: input.barberId ?? null,
        dayOfWeek: day.dayOfWeek,
        isOpen: day.isOpen,
        openTime: day.openTime,
        closeTime: day.closeTime,
      });
      saved.push(await this.workingHoursRepository.save(workingHours));
    }

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'UPDATE',
      entityType: 'WORKING_HOURS',
      entityId: input.barbershopId,
      after: { barberId: input.barberId ?? null, days: input.days },
    });

    return saved;
  }
}
