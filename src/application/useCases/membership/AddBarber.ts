import { randomUUID } from 'node:crypto';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type AddBarberInputDTO = {
  userId: string;
  barbershopId: string;
};

export default class AddBarberToBarbershopUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly userRepository: IUserRepository,
    private readonly barbershopRepository: IBarbershopRepository,
  ) {}

  async execute(input: AddBarberInputDTO): Promise<UserBarbershop> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    const existing = await this.userBarbershopRepository.findByUserAndBarbershop(
      input.userId,
      input.barbershopId,
    );
    if (existing) {
      throw new Error('Vínculo já existente');
    }

    const membership = new UserBarbershop({
      id: randomUUID(),
      userId: input.userId,
      barbershopId: input.barbershopId,
    });
    return this.userBarbershopRepository.save(membership);
  }
}
