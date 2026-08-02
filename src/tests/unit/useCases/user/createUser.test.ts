import { beforeEach, describe, expect, it } from 'vitest';
import CreateUserUseCase from '@/application/useCases/user/Create';
import { CreateUserInputDTO } from '@/application/dtos/UserDto';
import HashRepository from '@/domain/repository/HashRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';

class StubHashRepository implements HashRepository {
  public lastValue = '';

  async hash(value: string): Promise<string> {
    this.lastValue = value;
    return 'HashedPassword123';
  }

  async compare(): Promise<boolean> {
    return true;
  }
}

class StubIdGenerator implements IdGeneratorRepository {
  generate(): string {
    return '123e4567-e89b-41d3-a456-426614174000';
  }
}

describe('CreateUserUseCase Unit Tests', () => {
  const VALID_BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const VALID_USER_ID = '123e4567-e89b-41d3-a456-426614174000';

  let userRepository: UserRepositoryMemory;
  let hashRepository: StubHashRepository;
  let idGenerator: StubIdGenerator;
  let sut: CreateUserUseCase;

  const inputMock: CreateUserInputDTO = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '11999999999',
    barbershopId: VALID_BARBERSHOP_ID,
    password: 'Password123',
  };

  beforeEach(() => {
    userRepository = new UserRepositoryMemory();
    hashRepository = new StubHashRepository();
    idGenerator = new StubIdGenerator();
    sut = new CreateUserUseCase(userRepository, hashRepository, idGenerator);
  });

  it('deve criar e salvar um usuário com sucesso', async () => {
    const output = await sut.execute(inputMock);

    const savedUser = await userRepository.findByEmail(inputMock.email);

    expect(output).toEqual({
      id: VALID_USER_ID,
      name: inputMock.name,
      email: inputMock.email,
      phone: inputMock.phone,
      barbershopId: VALID_BARBERSHOP_ID,
      role: 'BARBER',
      isActive: true,
    });
    expect(savedUser).toBeTruthy();
    expect(savedUser?.password).toBe('HashedPassword123');
  });

  it('deve usar uma senha vazia quando a senha não for informada', async () => {
    const inputWithoutPassword = {
      ...inputMock,
      password: undefined,
    } as unknown as CreateUserInputDTO;

    await sut.execute(inputWithoutPassword);

    const savedUser = await userRepository.findByEmail(inputMock.email);

    expect(savedUser?.password).toBe('HashedPassword123');
  });

  it('deve impedir cadastro com email duplicado', async () => {
    await sut.execute(inputMock);

    await expect(sut.execute(inputMock)).rejects.toThrow('Email já cadastrado');
  });
});
