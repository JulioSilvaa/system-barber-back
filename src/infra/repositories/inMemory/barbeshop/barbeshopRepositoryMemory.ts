import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export default class BarbershopRepositoryMemory implements IBarbershopRepository {
  findBySlug(slug: string): Promise<Barbershop | null> {
    throw new Error('Method not implemented.');
  }
  save(barbershop: Barbershop): Promise<Barbershop> {
    throw new Error('Method not implemented.');
  }
  private barbershops: Barbershop[] = [];
  async create(barbershop: Barbershop): Promise<void> {
    this.barbershops.push(barbershop);
  }

  async findById(id: string): Promise<Barbershop | null> {
    const barbershop = this.barbershops.find(b => b.id === id);
    return barbershop || null;
  }

  async findAll(): Promise<Barbershop[]> {
    return this.barbershops;
  }
} 
