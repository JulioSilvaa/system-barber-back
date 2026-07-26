import { Barbershop } from '@/domain/entities/Barbershop';

export interface IBarbershopRepository {
  findById(id: string): Promise<Barbershop | null>;
  findBySlug(slug: string): Promise<Barbershop | null>;
  save(barbershop: Barbershop): Promise<Barbershop>;
}
