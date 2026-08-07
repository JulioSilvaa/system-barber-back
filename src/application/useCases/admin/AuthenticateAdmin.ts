import HashRepository from '@/domain/repository/HashRepository';
import IAdminRepository from '@/domain/repository/AdminRepository';
import { ITokenService, TokenPayload } from '@/domain/repository/TokenService';

export type AuthenticateAdminInputDTO = {
  email: string;
  password: string;
};

export type AuthenticateAdminOutputDTO = {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
};

export default class AuthenticateAdminUseCase {
  constructor(
    private readonly adminRepository: IAdminRepository,
    private readonly hashRepository: HashRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: AuthenticateAdminInputDTO): Promise<AuthenticateAdminOutputDTO> {
    if (!input.email || input.email.trim() === '') {
      throw new Error('Email é obrigatório');
    }

    if (!input.password || input.password.trim() === '') {
      throw new Error('Senha é obrigatória');
    }

    const admin = await this.adminRepository.findByEmail(input.email);
    if (!admin) {
      throw new Error('Admin não encontrado');
    }

    if (!admin.isActive) {
      throw new Error('Admin inativo');
    }

    const passwordMatches = await this.hashRepository.compare(input.password, admin.password);
    if (!passwordMatches) {
      throw new Error('Senha incorreta');
    }

    const payload: TokenPayload = { sub: admin.id, actor: 'ADMIN' };

    const accessToken = this.tokenService.sign(payload, '30m');
    const refreshToken = this.tokenService.sign(payload, '7d');

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        isActive: admin.isActive,
      },
    };
  }
}
