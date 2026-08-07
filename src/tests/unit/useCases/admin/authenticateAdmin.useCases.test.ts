import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthenticateAdminUseCase from '@/application/useCases/admin/AuthenticateAdmin';
import { ITokenService } from '@/domain/repository/TokenService';
import { Admin } from '@/domain/entities';
import AdminRepositoryMemory from '@/infra/repositories/inMemory/admin/adminRepositoryMemory';
import BcryptHashService from '@/infra/helpers/BcryptHash';

describe('AuthenticateAdminUseCase', () => {
  const ADMIN_ID = '123e4567-e89b-41d3-a456-426614174000';
  const email = 'admin@exemplo.com';
  const password = 'SenhaForte123';

  let adminRepository: AdminRepositoryMemory;
  let authenticateUseCase: AuthenticateAdminUseCase;
  let tokenService: ITokenService;

  beforeAll(() => {
    process.env.BCRYPT_SALT = '10';
  });

  beforeEach(async () => {
    adminRepository = new AdminRepositoryMemory();
    const hashService = new BcryptHashService();

    await adminRepository.save(
      new Admin({
        id: ADMIN_ID,
        name: 'Admin Plataforma',
        email,
        password: await hashService.hash(password),
      }),
    );

    tokenService = {
      sign: vi.fn((_payload: object, expiresIn: string) => `token-${expiresIn}`),
      verify: vi.fn(),
    } as unknown as ITokenService;

    authenticateUseCase = new AuthenticateAdminUseCase(
      adminRepository,
      new BcryptHashService(),
      tokenService,
    );
  });

  it('deve autenticar o admin e retornar os tokens com papel ADMIN', async () => {
    const output = await authenticateUseCase.execute({ email, password });

    expect(tokenService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: ADMIN_ID, actor: 'ADMIN' }),
      '30m',
    );
    expect(output).toEqual(
      expect.objectContaining({
        accessToken: 'token-30m',
        refreshToken: 'token-7d',
        admin: expect.objectContaining({
          id: ADMIN_ID,
          email,
          name: 'Admin Plataforma',
          isActive: true,
        }),
      }),
    );
    expect(output.admin).not.toHaveProperty('password');
  });

  it('deve exigir email', async () => {
    await expect(authenticateUseCase.execute({ email: '', password })).rejects.toThrow(
      'Email é obrigatório',
    );
  });

  it('deve exigir senha', async () => {
    await expect(authenticateUseCase.execute({ email, password: '' })).rejects.toThrow(
      'Senha é obrigatória',
    );
  });

  it('deve lançar erro quando o admin não existe', async () => {
    await expect(
      authenticateUseCase.execute({ email: 'nao-existe@example.com', password }),
    ).rejects.toThrow('Admin não encontrado');
  });

  it('deve lançar erro quando a senha está incorreta', async () => {
    await expect(
      authenticateUseCase.execute({ email, password: 'SenhaErrada123' }),
    ).rejects.toThrow('Senha incorreta');
  });
});
