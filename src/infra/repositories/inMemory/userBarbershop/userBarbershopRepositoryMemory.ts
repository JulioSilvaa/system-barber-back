import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export default class UserBarbershopRepositoryMemory implements IUserBarbershopRepository {
  private memberships: UserBarbershop[] = [];

  async save(membership: UserBarbershop): Promise<UserBarbershop> {
    const existingIndex = this.memberships.findIndex(item => item.id === membership.id);

    if (existingIndex !== -1) {
      this.memberships[existingIndex] = membership;
    } else {
      this.memberships.push(membership);
    }

    return membership;
  }

  async findByUserId(userId: string): Promise<UserBarbershop[]> {
    return this.memberships.filter(membership => membership.userId === userId);
  }

  async findByUserAndBarbershop(
    userId: string,
    barbershopId: string,
  ): Promise<UserBarbershop | null> {
    return (
      this.memberships.find(
        membership => membership.userId === userId && membership.barbershopId === barbershopId,
      ) ?? null
    );
  }
}
