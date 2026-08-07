import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthenticateBarbershopUseCase from '@/application/useCases/auth/AuthenticateBarbershop';
import { Barbershop } from '@/domain/entities/Barbershop';
import { ITokenService } from '@/domain/repository/TokenService';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import BcryptHashService from '@/infra/helpers/BcryptHash';

describe('AuthenticateBarbershopUseCase', () => {
  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  let barbershopRepository: BarbershopRepositoryMemory;
  let tokenService: ITokenService;
  let authenticateUseCase: AuthenticateBarbershopUseCase;

  const inputMock = {
    email: 'contato@barbeariacentral.com',
    password: 'SenhaForte1',
  };

  beforeAll(() => {
    process.env.BCRYPT_SALT = '10';
  });

  beforeEach(() => {
    barbershopRepository = new BarbershopRepositoryMemory();
    tokenService = {
      sign: vi.fn((_payload: object, expiresIn: string) => `token-${expiresIn}`),
      verify: vi.fn(),
    } as unknown as ITokenService;

    authenticateUseCase = new AuthenticateBarbershopUseCase(
      barbershopRepository,
      new BcryptHashService(),
      tokenService,
    );
  });

  async function createBarbershop(overrides: Partial<{ isActive: boolean; email: string }> = {}) {
    const hashService = new BcryptHashService();

    await barbershopRepository.save(
      new Barbershop({
        id: BARBERSHOP_ID,
        name: 'Barbearia Central',
        slug: 'barbearia-central',
        email: overrides.email ?? 'contato@barbeariacentral.com',
        phone: '+5516999999999',
        password: await hashService.hash('SenhaForte1'),
        isActive: overrides.isActive ?? true,
      }),
    );
  }

  describe('Autenticação com sucesso', () => {
    it('deve autenticar uma barbearia e retornar os tokens com actor BARBERSHOP', async () => {
      await createBarbershop();

      const output = await authenticateUseCase.execute(inputMock);

      expect(tokenService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: BARBERSHOP_ID, actor: 'BARBERSHOP' }),
        '30m',
      );
      expect(output).toEqual(
        expect.objectContaining({
          accessToken: 'token-30m',
          refreshToken: 'token-7d',
          barbershop: expect.objectContaining({
            id: BARBERSHOP_ID,
            email: inputMock.email,
          }),
        }),
      );
      expect(output.barbershop).not.toHaveProperty('password');
    });
  });

  describe('Validações de entrada', () => {
    it('deve exigir email', async () => {
      await expect(
        authenticateUseCase.execute({ email: '', password: 'SenhaForte1' }),
      ).rejects.toThrow('Email é obrigatório');
    });

    it('deve exigir senha', async () => {
      await expect(
        authenticateUseCase.execute({ email: inputMock.email, password: '' }),
      ).rejects.toThrow('Senha é obrigatória');
    });
  });

  describe('Falhas de autenticação', () => {
    it('deve lançar erro quando o email não está cadastrado', async () => {
      await expect(
        authenticateUseCase.execute({
          email: 'nao-existe@example.com',
          password: 'SenhaForte1',
        }),
      ).rejects.toThrow('Barbearia não encontrada');
    });

    it('deve lançar erro quando a senha estiver incorreta', async () => {
      await createBarbershop();

      await expect(
        authenticateUseCase.execute({ email: inputMock.email, password: 'SenhaErrada1' }),
      ).rejects.toThrow('Senha incorreta');
    });

    it('deve lançar erro quando a barbearia está inativa', async () => {
      await createBarbershop({ isActive: false });

      await expect(authenticateUseCase.execute(inputMock)).rejects.toThrow('Barbearia inativa');
    });
  });
});
