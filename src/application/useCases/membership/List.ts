import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export default class ListMembershipsUseCase {
  constructor(private readonly userBarbershopRepository: IUserBarbershopRepository) {}

  async execute(userId: string): Promise<UserBarbershop[]> {
    return this.userBarbershopRepository.findByUserId(userId);
  }
}
