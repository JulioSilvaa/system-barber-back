import { ValidationError, NotFoundError } from '@/domain/errors';
import { randomUUID } from 'node:crypto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Service } from '@/domain/entities/Service';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type CreateServiceInputDTO = {
  barbershopId: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
};

export default class CreateServiceUseCase {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: CreateServiceInputDTO, auditCtx?: AuditContext): Promise<Service> {
    if (!input.name || input.name.trim() === '') {
      throw new ValidationError('Nome do serviço é obrigatório');
    }

    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    const service = new Service({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      name: input.name.trim(),
      priceCents: input.priceCents,
      durationMinutes: input.durationMinutes,
    });

    const saved = await this.serviceRepository.save(service);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'CREATE',
      entityType: 'SERVICE',
      entityId: saved.id,
      after: {
        id: saved.id,
        name: saved.name,
        priceCents: saved.priceCents,
        durationMinutes: saved.durationMinutes,
        barbershopId: saved.barbershopId,
      },
    });

    return saved;
  }
}
