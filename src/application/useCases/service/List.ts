import { Service } from '@/domain/entities/Service';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';

export default class ListServicesUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(barbershopId: string): Promise<Service[]> {
    return this.serviceRepository.findAll(barbershopId);
  }
}
