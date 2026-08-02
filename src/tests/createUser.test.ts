import { describe, it, expect, beforeEach, vi, type Mocked } from "vitest";
import CreateUserUseCase from "@/application/useCases/user/Create";
import IUserRepository from "@/domain/repository/UserRepository";
import IdGeneratorRepository from "@/domain/repository/IdGeneratorRepository";
import HashRepository from "@/domain/repository/HashRepository";
import { CreateUserInputDTO } from "@/application/dtos/UserDto";
import User from "@/domain/entities/User";

describe("CreateUserUseCase Unit Tests", () => {
  let userRepositoryMock: Mocked<IUserRepository>;
  let hashRepositoryMock: Mocked<HashRepository>;
  let idGeneratorMock: Mocked<IdGeneratorRepository>;
  let sut: CreateUserUseCase;

  // UUIDs v4 válidos
  const VALID_USER_ID = "123e4567-e89b-41d3-a456-426614174000";
  const VALID_BARBERSHOP_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  // Senha hasheada que satisfaz: Maiúscula + Minúscula + Número
  const VALID_HASHED_PASSWORD = "HashedPassword123";

  const inputMock: CreateUserInputDTO = {
    name: "John Doe",
    email: "john@example.com",
    phone: "11999999999",
    barbershopId: VALID_BARBERSHOP_ID,
    password: "Password123",
  };

  beforeEach(() => {
    userRepositoryMock = {
      save: vi.fn(),
      findByEmail: vi.fn(),
    } as unknown as Mocked<IUserRepository>;

    hashRepositoryMock = {
      // Retorna uma senha com o formato exigido pelo User domain
      hash: vi.fn().mockResolvedValue(VALID_HASHED_PASSWORD),
      compare: vi.fn(),
    } as unknown as Mocked<HashRepository>;

    idGeneratorMock = {
      generate: vi.fn().mockReturnValue(VALID_USER_ID),
    } as unknown as Mocked<IdGeneratorRepository>;

    sut = new CreateUserUseCase(
      userRepositoryMock,
      hashRepositoryMock,
      idGeneratorMock
    );
  });

  it("deve criar e salvar um usuário com sucesso", async () => {
    const output = await sut.execute(inputMock);

    expect(output).toEqual({
      id: VALID_USER_ID,
      name: inputMock.name,
      email: inputMock.email,
      phone: inputMock.phone,
      barbershopId: VALID_BARBERSHOP_ID,
      role: expect.any(String),
      isActive: true,
    });

    expect(idGeneratorMock.generate).toHaveBeenCalledTimes(1);
    expect(hashRepositoryMock.hash).toHaveBeenCalledWith(inputMock.password);
    expect(userRepositoryMock.save).toHaveBeenCalledTimes(1);
    expect(userRepositoryMock.save).toHaveBeenCalledWith(expect.any(User));
  });

  it("deve passar uma string vazia para o hash caso a senha não seja informada", async () => {
    const inputWithoutPassword = { ...inputMock, password: undefined };

    await sut.execute(inputWithoutPassword as unknown as CreateUserInputDTO);

    // Garante que o use case repassou a string vazia para o serviço de hash
    expect(hashRepositoryMock.hash).toHaveBeenCalledWith("");
  });
});