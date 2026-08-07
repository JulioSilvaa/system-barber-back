import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import HashRepository from '@/domain/repository/HashRepository';
import { ITokenService, TokenPayload } from '@/domain/repository/TokenService';

export type AuthenticateBarbershopInputDTO = {
  email: string;
  password: string;
};

export type AuthenticateBarbershopOutputDTO = {
  accessToken: string;
  refreshToken: string;
  barbershop: {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone: string;
    isActive: boolean;
  };
};

export default class AuthenticateBarbershopUseCase {
  constructor(
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly hashRepository: HashRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: AuthenticateBarbershopInputDTO): Promise<AuthenticateBarbershopOutputDTO> {
    if (!input.email || input.email.trim() === '') {
      throw new Error('Email é obrigatório');
    }

    if (!input.password || input.password.trim() === '') {
      throw new Error('Senha é obrigatória');
    }

    const barbershop = await this.barbershopRepository.findByEmail(input.email);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    if (!barbershop.isActive) {
      throw new Error('Barbearia inativa');
    }

    const passwordMatches = await this.hashRepository.compare(input.password, barbershop.password);
    if (!passwordMatches) {
      throw new Error('Senha incorreta');
    }

    const payload: TokenPayload = { sub: barbershop.id, actor: 'BARBERSHOP' };

    const accessToken = this.tokenService.sign(payload, '30m');
    const refreshToken = this.tokenService.sign(payload, '7d');

    return {
      accessToken,
      refreshToken,
      barbershop: {
        id: barbershop.id,
        name: barbershop.name,
        slug: barbershop.slug,
        email: barbershop.email,
        phone: barbershop.phone,
        isActive: barbershop.isActive,
      },
    };
  }
}
