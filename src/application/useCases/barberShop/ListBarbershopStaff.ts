import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';

export type StaffMemberDTO = {
  userId: string;
  name: string;
  phone?: string;
  localRole: string;
  status: string;
};

export default class ListBarbershopStaffUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(barbershopId: string): Promise<StaffMemberDTO[]> {
    const memberships = await this.userBarbershopRepository.findByBarbershop(barbershopId);
    const users = await Promise.all(
      memberships.map(membership => this.userRepository.findById(membership.userId)),
    );

    return memberships
      .map((membership, index) => ({
        userId: membership.userId,
        name: users[index]?.name ?? 'Desconhecido',
        phone: users[index]?.phone,
        localRole: membership.localRole,
        status: membership.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
