import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateUserUseCase from '@/application/useCases/user/Create';
import AuthenticateUserUseCase from '@/application/useCases/auth/Authenticate';
import { CreateUserInputDTO } from '@/application/dtos/UserDto';
import { ITokenService } from '@/domain/repository/TokenService';
import { UserBarbershop } from '@/domain/entities';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import BcryptHashService from '@/infra/helpers/BcryptHash';
import { makeUserBarbershopProps } from '@/tests/helpers/factories';

describe('AuthenticateUserUseCase', () => {
  const VALID_USER_ID = '123e4567-e89b-41d3-a456-426614174000';

  let userRepository: UserRepositoryMemory;
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let createUserUseCase: CreateUserUseCase;
  let authenticateUseCase: AuthenticateUserUseCase;
  let tokenService: ITokenService;

  const inputMock: CreateUserInputDTO = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '11999999999',
    password: 'Password123',
  };

  beforeAll(() => {
    process.env.BCRYPT_SALT = '10';
  });

  beforeEach(() => {
    userRepository = new UserRepositoryMemory();
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    createUserUseCase = new CreateUserUseCase(userRepository, new BcryptHashService(), {
      generate: () => VALID_USER_ID,
    });

    tokenService = {
      sign: vi.fn((_payload: object, expiresIn: string) => `token-${expiresIn}`),
      verify: vi.fn(),
    } as unknown as ITokenService;

    authenticateUseCase = new AuthenticateUserUseCase(
      userRepository,
      new BcryptHashService(),
      tokenService,
      userBarbershopRepository,
    );
  });

  describe('Autenticação com sucesso', () => {
    it('deve autenticar um usuário e retornar os tokens', async () => {
      await createUserUseCase.execute(inputMock);

      const output = await authenticateUseCase.execute({
        email: inputMock.email,
        password: inputMock.password,
      });

      expect(tokenService.sign).toHaveBeenCalled();
      expect(output).toEqual(
        expect.objectContaining({
          accessToken: 'token-30m',
          refreshToken: 'token-7d',
          user: expect.objectContaining({
            id: VALID_USER_ID,
            email: inputMock.email,
          }),
        }),
      );
      expect(output.user).not.toHaveProperty('password');
    });

    it('deve incluir barbershopId e localRole do vínculo ativo no payload', async () => {
      await createUserUseCase.execute(inputMock);
      await userBarbershopRepository.save(
        new UserBarbershop(makeUserBarbershopProps({ userId: VALID_USER_ID, localRole: 'BARBER' })),
      );

      const output = await authenticateUseCase.execute({
        email: inputMock.email,
        password: inputMock.password,
      });

      expect(tokenService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: VALID_USER_ID,
          actor: 'USER',
          barbershopId: 'barbershop-1',
          localRole: 'BARBER',
        }),
        '30m',
      );
      expect(output.user).toEqual(
        expect.objectContaining({ barbershopId: 'barbershop-1', localRole: 'BARBER' }),
      );
    });

    it('não deve incluir vínculo quando o usuário não tem vínculo ativo', async () => {
      await createUserUseCase.execute(inputMock);

      const output = await authenticateUseCase.execute({
        email: inputMock.email,
        password: inputMock.password,
      });

      expect(output.user.barbershopId).toBeUndefined();
      expect(output.user.localRole).toBeUndefined();
    });
  });

  describe('Validações de entrada', () => {
    it('deve exigir email', async () => {
      await expect(
        authenticateUseCase.execute({ email: '', password: 'Password123' }),
      ).rejects.toThrow('Email do usuário é obrigatório');
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
          password: 'Password123',
        }),
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('deve lançar erro quando a senha estiver incorreta', async () => {
      await createUserUseCase.execute(inputMock);

      await expect(
        authenticateUseCase.execute({
          email: inputMock.email,
          password: 'SenhaErrada123',
        }),
      ).rejects.toThrow('Senha incorreta');
    });
  });
});
