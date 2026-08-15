import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Service } from '@/domain/entities/Service';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';

export type UpdateServiceInputDTO = {
  serviceId: string;
  barbershopId: string;
  name?: string;
  priceCents?: number;
  durationMinutes?: number;
};

export default class UpdateServiceUseCase {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: UpdateServiceInputDTO, auditCtx?: AuditContext): Promise<Service> {
    const service = await this.serviceRepository.findById(input.serviceId, input.barbershopId);
    if (!service) {
      throw new NotFoundError('Serviço não encontrado');
    }

    const before = {
      name: service.name,
      priceCents: service.priceCents,
      durationMinutes: service.durationMinutes,
    };

    service.updateDetails({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
    });

    const updated = await this.serviceRepository.update(service);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'UPDATE',
      entityType: 'SERVICE',
      entityId: updated.id,
      before,
      after: {
        id: updated.id,
        name: updated.name,
        priceCents: updated.priceCents,
        durationMinutes: updated.durationMinutes,
        barbershopId: updated.barbershopId,
      },
    });

    return updated;
  }
}
