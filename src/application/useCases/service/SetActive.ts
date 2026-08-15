import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Service } from '@/domain/entities/Service';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';

export type SetServiceActiveInputDTO = {
  serviceId: string;
  barbershopId: string;
  isActive: boolean;
};

export default class SetServiceActiveUseCase {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: SetServiceActiveInputDTO, auditCtx?: AuditContext): Promise<Service> {
    const service = await this.serviceRepository.findById(input.serviceId, input.barbershopId);
    if (!service) {
      throw new NotFoundError('Serviço não encontrado');
    }

    const previousStatus = service.isActive;
    if (input.isActive) {
      service.activate();
    } else {
      service.deactivate();
    }

    const saved = await this.serviceRepository.update(service);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'STATUS_CHANGE',
      entityType: 'SERVICE',
      entityId: saved.id,
      before: { isActive: previousStatus },
      after: { isActive: saved.isActive },
    });

    return saved;
  }
}
