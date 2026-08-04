import { ITokenService, TokenPayload } from '@/domain/repository/TokenService';
import HashRepository from '@/domain/repository/HashRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export type AuthenticateInputDTO = {
  email: string;
  password: string;
};

export type AuthenticateOutputDTO = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    globalRole: string;
    isActive: boolean;
    barbershopId?: string;
    localRole?: string;
  };
};

export default class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashRepository: HashRepository,
    private readonly tokenService: ITokenService,
    private readonly userBarbershopRepository: IUserBarbershopRepository,
  ) {}

  async execute(input: AuthenticateInputDTO): Promise<AuthenticateOutputDTO> {
    if (!input.email || input.email.trim() === '') {
      throw new Error('Email do usuário é obrigatório');
    }

    if (!input.password || input.password.trim() === '') {
      throw new Error('Senha é obrigatória');
    }

    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const passwordMatches = await this.hashRepository.compare(input.password, user.password ?? '');
    if (!passwordMatches) {
      throw new Error('Senha incorreta');
    }

    const activeMembership = await this.findActiveMembership(user.id);
    const basePayload: TokenPayload = { sub: user.id, globalRole: user.globalRole };

    if (activeMembership) {
      basePayload.barbershopId = activeMembership.barbershopId;
      basePayload.localRole = activeMembership.localRole;
    }

    const accessToken = this.tokenService.sign(basePayload, '30m');
    const refreshToken = this.tokenService.sign(basePayload, '7d');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        globalRole: user.globalRole,
        isActive: user.isActive,
        barbershopId: activeMembership?.barbershopId,
        localRole: activeMembership?.localRole,
      },
    };
  }

  private async findActiveMembership(userId: string) {
    const memberships = await this.userBarbershopRepository.findByUserId(userId);
    return memberships.find(membership => membership.isActive()) ?? null;
  }
}
