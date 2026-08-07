import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';

export type PublicBarberDTO = {
  id: string;
  name: string;
  localRole: string;
};

export default class ListBarbersUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(barbershopId: string): Promise<PublicBarberDTO[]> {
    const memberships = await this.userBarbershopRepository.findActiveByBarbershop(barbershopId);
    const barbers = memberships.filter(membership => membership.localRole === 'BARBER');
    const users = await Promise.all(
      barbers.map(membership => this.userRepository.findById(membership.userId)),
    );

    return barbers.map((membership, index) => ({
      id: membership.userId,
      name: users[index]?.name ?? 'Desconhecido',
      localRole: membership.localRole,
    }));
  }
}
