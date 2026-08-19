import { Barbershop } from '@/domain/entities/Barbershop';

export interface IBarbershopRepository {
  findById(id: string): Promise<Barbershop | null>;
  findBySlug(slug: string): Promise<Barbershop | null>;
  findByEmail(email: string): Promise<Barbershop | null>;
  save(barbershop: Barbershop): Promise<Barbershop>;
  setActive(id: string, isActive: boolean): Promise<Barbershop | null>;
  update(
    id: string,
    data: Partial<Pick<Barbershop, 'name' | 'primaryColor' | 'logoUrl' | 'reminderHoursBefore'>>,
  ): Promise<Barbershop | null>;
}
