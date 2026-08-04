import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export default class BarbershopRepositoryMemory implements IBarbershopRepository {
  private readonly barbershops: Barbershop[] = [];

  async findBySlug(slug: string): Promise<Barbershop | null> {
    return this.barbershops.find(barbershop => barbershop.slug === slug) ?? null;
  }

  async save(barbershop: Barbershop): Promise<Barbershop> {
    this.barbershops.push(barbershop);
    return barbershop;
  }

  async create(barbershop: Barbershop): Promise<void> {
    this.barbershops.push(barbershop);
  }

  async findById(id: string): Promise<Barbershop | null> {
    return this.barbershops.find(barbershop => barbershop.id === id) ?? null;
  }

  async findAll(): Promise<Barbershop[]> {
    return this.barbershops;
  }
}
