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
    const users = await this.userRepository.findByIds(
      memberships.map(membership => membership.userId),
    );
    const userById = new Map(users.map(user => [user.id, user]));

    return memberships
      .map(membership => ({
        userId: membership.userId,
        name: userById.get(membership.userId)?.name ?? 'Desconhecido',
        phone: userById.get(membership.userId)?.phone,
        localRole: membership.localRole,
        status: membership.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
