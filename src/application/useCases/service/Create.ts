import { randomUUID } from 'node:crypto';
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
  ) {}

  async execute(input: CreateServiceInputDTO): Promise<Service> {
    if (!input.name || input.name.trim() === '') {
      throw new Error('Nome do serviço é obrigatório');
    }

    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    const service = new Service({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      name: input.name.trim(),
      priceCents: input.priceCents,
      durationMinutes: input.durationMinutes,
    });

    return this.serviceRepository.save(service);
  }
}
