import { UserBarbershop } from '@/domain/entities';

export default interface IUserBarbershopRepository {
  save(membership: UserBarbershop): Promise<UserBarbershop>;
  findByUserId(userId: string): Promise<UserBarbershop[]>;
  findByUserAndBarbershop(userId: string, barbershopId: string): Promise<UserBarbershop | null>;
  findByBarbershop(barbershopId: string): Promise<UserBarbershop[]>;
  findActiveByBarbershop(barbershopId: string): Promise<UserBarbershop[]>;
  findById(id: string): Promise<UserBarbershop | null>;
  delete(id: string): Promise<void>;
}
