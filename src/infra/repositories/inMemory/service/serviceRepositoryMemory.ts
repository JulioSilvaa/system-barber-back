import { NotFoundError } from '@/domain/errors';
import { Service } from '@/domain/entities/Service';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';

export default class ServiceRepositoryMemory implements IServiceRepository {
  private services: Service[] = [];

  async findById(id: string, barbershopId: string): Promise<Service | null> {
    return (
      this.services.find(service => service.id === id && service.barbershopId === barbershopId) ??
      null
    );
  }

  async findAll(barbershopId: string): Promise<Service[]> {
    return this.services.filter(service => service.barbershopId === barbershopId);
  }

  async save(service: Service): Promise<Service> {
    const existingIndex = this.services.findIndex(item => item.id === service.id);

    if (existingIndex !== -1) {
      this.services[existingIndex] = service;
    } else {
      this.services.push(service);
    }

    return service;
  }

  async update(service: Service): Promise<Service> {
    const existingIndex = this.services.findIndex(item => item.id === service.id);

    if (existingIndex === -1) {
      throw new NotFoundError('Serviço não encontrado');
    }

    this.services[existingIndex] = service;

    return service;
  }
}
