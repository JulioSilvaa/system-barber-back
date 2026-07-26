import { Service } from '@/domain/entities/Service';

export interface IServiceRepository {
  findById(id: string, barbershopId: string): Promise<Service | null>;
  findAll(barbershopId: string): Promise<Service[]>;
  save(service: Service): Promise<Service>;
}
