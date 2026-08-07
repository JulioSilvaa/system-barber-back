import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export default class ListBarbershopMembershipsUseCase {
  constructor(private readonly userBarbershopRepository: IUserBarbershopRepository) {}

  async execute(barbershopId: string): Promise<UserBarbershop[]> {
    return this.userBarbershopRepository.findByBarbershop(barbershopId);
  }
}
