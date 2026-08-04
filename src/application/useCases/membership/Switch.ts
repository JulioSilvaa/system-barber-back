import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export default class SwitchBarbershopUseCase {
  constructor(private readonly userBarbershopRepository: IUserBarbershopRepository) {}

  async execute(userId: string, barbershopId: string): Promise<UserBarbershop> {
    const memberships = await this.userBarbershopRepository.findByUserId(userId);
    const target = memberships.find(membership => membership.barbershopId === barbershopId);

    if (!target) {
      throw new Error('Vínculo não encontrado');
    }

    for (const membership of memberships) {
      if (membership.barbershopId === barbershopId) {
        membership.activate();
      } else {
        membership.deactivate();
      }
      await this.userBarbershopRepository.save(membership);
    }

    return target;
  }
}
