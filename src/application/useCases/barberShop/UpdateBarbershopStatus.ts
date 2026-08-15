import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type UpdateBarbershopStatusInput = {
  barbershopId: string;
  isActive: boolean;
};

export default class UpdateBarbershopStatusUseCase {
  constructor(
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: UpdateBarbershopStatusInput, auditCtx?: AuditContext): Promise<Barbershop> {
    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    if (barbershop.isActive === input.isActive) {
      return barbershop;
    }

    const updated = await this.barbershopRepository.setActive(input.barbershopId, input.isActive);
    if (!updated) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: updated.id,
      action: 'STATUS_CHANGE',
      entityType: 'BARBERSHOP',
      entityId: updated.id,
      before: { isActive: barbershop.isActive },
      after: { isActive: updated.isActive },
    });

    return updated;
  }
}
