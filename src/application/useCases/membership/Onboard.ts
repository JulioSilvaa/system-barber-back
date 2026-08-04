import { randomUUID } from 'node:crypto';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export default class OnboardUserUseCase {
  constructor(private readonly userBarbershopRepository: IUserBarbershopRepository) {}

  async execute(userId: string, barbershopId: string): Promise<UserBarbershop> {
    const existing = await this.userBarbershopRepository.findByUserAndBarbershop(
      userId,
      barbershopId,
    );

    if (existing) {
      throw new Error('Vínculo já existente');
    }

    const membership = new UserBarbershop({ id: randomUUID(), userId, barbershopId });
    return this.userBarbershopRepository.save(membership);
  }
}
