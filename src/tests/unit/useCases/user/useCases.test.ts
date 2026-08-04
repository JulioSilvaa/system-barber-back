import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateUserUseCase from '@/application/useCases/user/Create';
import CreateAdminUserUseCase from '@/application/useCases/user/CreateAdmin';
import DeleteUserUseCase from '@/application/useCases/user/Delete';
import FindUserByIdUseCase from '@/application/useCases/user/Find';
import ListUserUseCase from '@/application/useCases/user/List';
import UpdateUserRoleUseCase from '@/application/useCases/user/UpdateRole';
import { CreateUserInputDTO } from '@/application/dtos/UserDto';
import { GlobalUserRole } from '@/domain/entities/User';
import HashRepository from '@/domain/repository/HashRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';

describe('User Use Cases Unit Tests', () => {
  const VALID_USER_ID = '123e4567-e89b-41d3-a456-426614174000';
  const NON_EXISTENT_ID = 'f47ac10b-0000-0000-0000-000000000000';

  let userRepository: UserRepositoryMemory;
  let mockHashRepository: HashRepository;
  let mockIdGenerator: IdGeneratorRepository;

  let createUseCase: CreateUserUseCase;
  let createAdminUseCase: CreateAdminUserUseCase;
  let deleteUseCase: DeleteUserUseCase;
  let findByIdUseCase: FindUserByIdUseCase;
  let listUserUseCase: ListUserUseCase;
  let updateRoleUseCase: UpdateUserRoleUseCase;

  const inputMock: CreateUserInputDTO = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '11999999999',
    password: 'Password123',
  };

  beforeEach(() => {
    userRepository = new UserRepositoryMemory();

    mockHashRepository = {
      hash: vi.fn().mockResolvedValue('HashedPassword123'),
      compare: vi.fn().mockResolvedValue(true),
    };

    mockIdGenerator = {
      generate: vi.fn().mockReturnValue(VALID_USER_ID),
    };

    createUseCase = new CreateUserUseCase(userRepository, mockHashRepository, mockIdGenerator);
    createAdminUseCase = new CreateAdminUserUseCase(
      userRepository,
      mockHashRepository,
      mockIdGenerator,
    );
    deleteUseCase = new DeleteUserUseCase(userRepository);
    findByIdUseCase = new FindUserByIdUseCase(userRepository);
    listUserUseCase = new ListUserUseCase(userRepository);
    updateRoleUseCase = new UpdateUserRoleUseCase(userRepository);
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
        globalRole: 'USER',
        isActive: true,
      });
      expect(output).not.toHaveProperty('barbershopId');
      expect(output).not.toHaveProperty('role');
      expect(mockHashRepository.hash).toHaveBeenCalledWith(inputMock.password);
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(savedUser).toBeTruthy();
      expect(savedUser?.password).toBe('HashedPassword123');
    });

    it('não deve permitir elevar o papel global pelo cadastro público', async () => {
      const input = { ...inputMock, globalRole: 'SUPER_ADMIN' } as unknown as CreateUserInputDTO;

      const output = await createUseCase.execute(input);

      expect(output.globalRole).toBe('USER');
    });

    it('deve impedir cadastro com email duplicado', async () => {
      await createUseCase.execute(inputMock);

      await expect(createUseCase.execute(inputMock)).rejects.toThrow('Email já cadastrado');
    });
  });

  describe('CreateAdminUserUseCase', () => {
    it('deve criar um usuário SUPER_ADMIN', async () => {
      const output = await createAdminUseCase.execute(inputMock);

      const savedUser = await userRepository.findByEmail(inputMock.email);

      expect(output.globalRole).toBe('SUPER_ADMIN');
      expect(savedUser?.globalRole).toBe('SUPER_ADMIN');
      expect(savedUser?.password).toBe('HashedPassword123');
    });

    it('deve impedir criação com email duplicado', async () => {
      await createAdminUseCase.execute(inputMock);

      await expect(createAdminUseCase.execute(inputMock)).rejects.toThrow('Email já cadastrado');
    });
  });

  describe('UpdateUserRoleUseCase', () => {
    it('deve atualizar o papel global de um usuário existente', async () => {
      await createUseCase.execute(inputMock);

      const updatedRole = await updateRoleUseCase.execute(VALID_USER_ID, 'SUPER_ADMIN');

      const savedUser = await userRepository.findById(VALID_USER_ID);
      expect(updatedRole).toBe('SUPER_ADMIN');
      expect(savedUser?.globalRole).toBe('SUPER_ADMIN');
    });

    it('deve rejeitar um papel global inválido', async () => {
      await createUseCase.execute(inputMock);

      await expect(
        updateRoleUseCase.execute(VALID_USER_ID, 'ADMIN' as GlobalUserRole),
      ).rejects.toThrow('Papel global inválido');
    });

    it('deve lançar erro quando o usuário não existe', async () => {
      await expect(updateRoleUseCase.execute(NON_EXISTENT_ID, 'SUPER_ADMIN')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('deve lançar erro quando o ID é inválido', async () => {
      await expect(updateRoleUseCase.execute('id-invalido', 'SUPER_ADMIN')).rejects.toThrow(
        'ID do usuário é inválido',
      );
    });

    it('deve lançar erro quando o ID não é informado', async () => {
      await expect(updateRoleUseCase.execute('', 'SUPER_ADMIN')).rejects.toThrow(
        'ID do usuário é obrigatório',
      );
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
        globalRole: 'USER',
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

    it('deve lançar erro quando o telefone não for informado', async () => {
      const input = { ...inputMock, phone: '' };

      await expect(createUseCase.execute(input)).rejects.toThrow('Telefone é obrigatório');
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

    it('deve lançar erro quando a senha não for informada', async () => {
      const input = { ...inputMock, password: undefined } as unknown as CreateUserInputDTO;

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Senha deve ter entre 8 e 72 caracteres',
      );
    });

    it('deve rejeitar senha fraca informada pelo usuário', async () => {
      const input = { ...inputMock, password: '123' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Senha deve ter entre 8 e 72 caracteres',
      );
    });

    it('deve rejeitar senha sem letra maiúscula', async () => {
      const input = { ...inputMock, password: 'password123' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });

    it('deve rejeitar senha sem letra minúscula', async () => {
      const input = { ...inputMock, password: 'PASSWORD123' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });

    it('deve rejeitar senha sem número', async () => {
      const input = { ...inputMock, password: 'PasswordSemNumero' };

      await expect(createUseCase.execute(input)).rejects.toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });

    it('não deve chamar o hash quando a senha for inválida', async () => {
      const input = { ...inputMock, password: '123' };

      await expect(createUseCase.execute(input)).rejects.toThrow();
      expect(mockHashRepository.hash).not.toHaveBeenCalled();
    });
  });
});
