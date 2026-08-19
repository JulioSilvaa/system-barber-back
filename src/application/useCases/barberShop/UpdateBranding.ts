import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type UpdateBrandingInput = {
  barbershopId: string;
  name?: string;
  primaryColor?: string;
  logoUrl?: string;
  reminderHoursBefore?: number;
};

export default class UpdateBrandingUseCase {
  constructor(
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: UpdateBrandingInput, auditCtx?: AuditContext): Promise<Barbershop> {
    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    const before = {
      name: barbershop.name,
      primaryColor: barbershop.primaryColor,
      logoUrl: barbershop.logoUrl,
    };

    const updated = await this.barbershopRepository.update(input.barbershopId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.reminderHoursBefore !== undefined
        ? { reminderHoursBefore: input.reminderHoursBefore }
        : {}),
    });
    if (!updated) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: updated.id,
      action: 'BRANDING_UPDATE',
      entityType: 'BARBERSHOP',
      entityId: updated.id,
      before,
      after: {
        name: updated.name,
        primaryColor: updated.primaryColor,
        logoUrl: updated.logoUrl,
      },
    });

    return updated;
  }
}
