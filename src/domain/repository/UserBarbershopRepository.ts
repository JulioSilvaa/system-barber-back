import { UserBarbershop } from '@/domain/entities';

export default interface IUserBarbershopRepository {
  save(membership: UserBarbershop): Promise<UserBarbershop>;
  findByUserId(userId: string): Promise<UserBarbershop[]>;
  findByUserAndBarbershop(userId: string, barbershopId: string): Promise<UserBarbershop | null>;
}
