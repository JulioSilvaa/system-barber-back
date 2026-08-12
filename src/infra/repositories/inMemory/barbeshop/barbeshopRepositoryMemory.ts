import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export default class BarbershopRepositoryMemory implements IBarbershopRepository {
  private readonly barbershops: Barbershop[] = [];

  async findBySlug(slug: string): Promise<Barbershop | null> {
    return this.barbershops.find(barbershop => barbershop.slug === slug) ?? null;
  }

  async findByEmail(email: string): Promise<Barbershop | null> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.barbershops.find(barbershop => barbershop.email === normalizedEmail) ?? null;
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

  async setActive(id: string, isActive: boolean): Promise<Barbershop | null> {
    const index = this.barbershops.findIndex(barbershop => barbershop.id === id);

    if (index === -1) {
      return null;
    }

    const current = this.barbershops[index];
    const updated = new Barbershop({
      id: current.id,
      name: current.name,
      slug: current.slug,
      email: current.email,
      phone: current.phone,
      password: current.password,
      primaryColor: current.primaryColor,
      logoUrl: current.logoUrl,
      isActive,
    });

    this.barbershops[index] = updated;
    return updated;
  }

  async update(
    id: string,
    data: Partial<Pick<Barbershop, 'name' | 'primaryColor' | 'logoUrl'>>,
  ): Promise<Barbershop | null> {
    const index = this.barbershops.findIndex(barbershop => barbershop.id === id);

    if (index === -1) {
      return null;
    }

    const current = this.barbershops[index];
    const updated = new Barbershop({
      id: current.id,
      name: data.name ?? current.name,
      slug: current.slug,
      email: current.email,
      phone: current.phone,
      password: current.password,
      primaryColor: data.primaryColor ?? current.primaryColor,
      logoUrl: data.logoUrl ?? current.logoUrl,
      isActive: current.isActive,
    });

    this.barbershops[index] = updated;
    return updated;
  }
}
