import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateUserUseCase from '@/application/useCases/user/Create';
import DeleteUserUseCase from '@/application/useCases/user/Delete';
import FindUserByIdUseCase from '@/application/useCases/user/Find';
import ListUserUseCase from '@/application/useCases/user/List';
import { CreateUserInputDTO } from '@/application/dtos/UserDto';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';

describe('User Use Cases Unit Tests', () => {
  const VALID_USER_ID = '123e4567-e89b-41d3-a456-426614174000';
  const NON_EXISTENT_ID = 'f47ac10b-0000-0000-0000-000000000000';

  let userRepository: UserRepositoryMemory;
  let mockIdGenerator: IdGeneratorRepository;

  let createUseCase: CreateUserUseCase;
  let deleteUseCase: DeleteUserUseCase;
  let findByIdUseCase: FindUserByIdUseCase;
  let listUserUseCase: ListUserUseCase;

  const inputMock: CreateUserInputDTO = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '11999999999',
  };

  beforeEach(() => {
    userRepository = new UserRepositoryMemory();

    mockIdGenerator = {
      generate: vi.fn().mockReturnValue(VALID_USER_ID),
    };

    createUseCase = new CreateUserUseCase(userRepository, mockIdGenerator);
    deleteUseCase = new DeleteUserUseCase(userRepository);
    findByIdUseCase = new FindUserByIdUseCase(userRepository);
    listUserUseCase = new ListUserUseCase(userRepository);
  });

  describe('CreateUserUseCase', () => {
    it('deve criar e salvar um usuário global com sucesso', async () => {
      const output = await createUseCase.execute(inputMock);

      const savedUser = await userRepository.findByEmail(inputMock.email);

      expect(output).toEqual({
        id: VALID_USER_ID,
        name: inputMock.name,
        email: inputMock.email,
        phone: inputMock.phone,
        isActive: true,
      });
      expect(output).not.toHaveProperty('barbershopId');
      expect(output).not.toHaveProperty('role');
      expect(output).not.toHaveProperty('password');
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(savedUser).toBeTruthy();
    });

    it('deve impedir cadastro com email duplicado', async () => {
      await createUseCase.execute(inputMock);

      await expect(createUseCase.execute(inputMock)).rejects.toThrow('Email já cadastrado');
    });
  });

  describe('FindUserByIdUseCase', () => {
    it('deve retornar um usuário existente pelo ID', async () => {
      await createUseCase.execute(inputMock);

      const output = await findByIdUseCase.execute(VALID_USER_ID);

      expect(output).toEqual({
        id: VALID_USER_ID,
        name: inputMock.name,
        email: inputMock.email,
        phone: inputMock.phone,
        isActive: true,
      });
    });

    it('deve retornar null ao buscar um usuário inexistente', async () => {
      const output = await findByIdUseCase.execute(NON_EXISTENT_ID);

      expect(output).toBeNull();
    });
  });

  describe('ListUsersUseCase', () => {
    it('deve retornar a lista contendo os usuários cadastrados', async () => {
      await createUseCase.execute(inputMock);

      const output = await listUserUseCase.execute();

      expect(output).toHaveLength(1);
      expect(output[0].id).toBe(VALID_USER_ID);
      expect(output[0].email).toBe(inputMock.email);
    });

    it('deve retornar uma lista vazia quando não houver usuários', async () => {
      const output = await listUserUseCase.execute();

      expect(output).toEqual([]);
    });
  });

  describe('DeleteUserUseCase', () => {
    it('deve deletar um usuário existente através do ID', async () => {
      await createUseCase.execute(inputMock);

      const existingUser = await userRepository.findById(VALID_USER_ID);
      expect(existingUser).toBeTruthy();

      await deleteUseCase.execute(VALID_USER_ID);

      const userAfterDeletion = await userRepository.findById(VALID_USER_ID);
      expect(userAfterDeletion).toBeNull();
    });

    it('deve lançar erro ao tentar deletar um usuário inexistente', async () => {
      await expect(deleteUseCase.execute(NON_EXISTENT_ID)).rejects.toThrow(
        'Usuário não encontrado',
      );
    });
  });

  describe('CreateUserUseCase - validações de campos', () => {
    it('deve lançar erro quando o email não for informado', async () => {
      const input = { ...inputMock, email: '' };

      await expect(createUseCase.execute(input)).rejects.toThrow('Email é obrigatório');
    });

    it('deve lançar erro quando o email não for informado (apenas espaços)', async () => {
      const input = { ...inputMock, email: '   ' };

      await expect(createUseCase.execute(input)).rejects.toThrow('Email é obrigatório');
    });

    it('deve lançar erro quando o email tiver formato inválido', async () => {
      const input = { ...inputMock, email: 'email-invalido' };

      await expect(createUseCase.execute(input)).rejects.toThrow('Formato de email inválido');
    });

    it('deve lançar erro quando o nome não for informado', async () => {
      const input = { ...inputMock, name: '' };

      await expect(createUseCase.execute(input)).rejects.toThrow('Nome é obrigatório');
    });

    it('deve lançar erro quando o nome for muito curto', async () => {
      const input = { ...inputMock, name: 'A' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Nome deve ter entre 2 e 80 caracteres',
      );
    });

    it('deve lançar erro quando o nome for muito longo', async () => {
      const input = { ...inputMock, name: 'A'.repeat(81) };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Nome deve ter entre 2 e 80 caracteres',
      );
    });

    it('deve lançar erro quando o nome contiver caracteres inválidos', async () => {
      const input = { ...inputMock, name: 'John123' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Nome contém caracteres inválidos',
      );
    });

    it('deve aceitar telefone vazio (opcional)', async () => {
      const input = { ...inputMock, phone: '' };

      await expect(createUseCase.execute(input)).resolves.toBeDefined();
    });

    it('deve lançar erro quando o telefone tiver menos de 10 dígitos', async () => {
      const input = { ...inputMock, phone: '123456789' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Telefone deve ter 10 ou 11 dígitos',
      );
    });

    it('deve lançar erro quando o telefone tiver mais de 11 dígitos', async () => {
      const input = { ...inputMock, phone: '123456789012' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Telefone deve ter 10 ou 11 dígitos',
      );
    });

    it('deve lançar erro quando o telefone for uma sequência repetida', async () => {
      const input = { ...inputMock, phone: '11111111111' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Telefone não pode ser uma sequência repetida de dígitos',
      );
    });

    it('deve lançar erro quando o DDD do telefone for inválido', async () => {
      const input = { ...inputMock, phone: '00999999999' };

      await expect(createUseCase.execute(input)).rejects.toThrow('DDD do telefone é inválido');
    });

    it('deve lançar erro quando celular não começar com 9 após o DDD', async () => {
      const input = { ...inputMock, phone: '11888888888' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Celulares devem começar com 9 após o DDD',
      );
    });
  });
});
