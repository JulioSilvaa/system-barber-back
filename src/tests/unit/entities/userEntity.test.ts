import { describe, expect, it } from 'vitest';
import User from '@/domain/entities/User';

const makeUser = (overrides = {}) =>
  User.create({
    id: '1',
    barbershopId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Julio Silva',
    phone: '16999999999',
    role: 'BARBER',
    email: 'julio@email.com',
    password: 'Senha123',
    isActive: true,
    ...overrides,
  });

describe('User Entity', () => {
  describe('Criação', () => {
    it('deve criar um usuário válido', () => {
      const user = makeUser();

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe('1');
      expect(user.barbershopId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(user.name).toBe('Julio Silva');
      expect(user.phone).toBe('16999999999');
      expect(user.role).toBe('BARBER');
      expect(user.email).toBe('julio@email.com');
      expect(user.password).toBe('Senha123');
      expect(user.isActive).toBe(true);
    });

    it('deve definir BARBER como role padrão', () => {
      const user = makeUser({
        role: undefined,
      });

      expect(user.role).toBe('BARBER');
    });

    it('deve definir isActive=true por padrão', () => {
      const user = makeUser({
        isActive: undefined,
      });

      expect(user.isActive).toBe(true);
    });
  });

  describe('Validação de Nome', () => {
    it('deve exigir nome', () => {
      expect(() =>
        makeUser({
          name: '',
        }),
      ).toThrow('Nome é obrigatório');
    });

    it('deve exigir no mínimo 2 caracteres', () => {
      expect(() =>
        makeUser({
          name: 'A',
        }),
      ).toThrow('Nome deve ter entre 2 e 80 caracteres');
    });

    it('deve exigir no máximo 80 caracteres', () => {
      expect(() =>
        makeUser({
          name: 'A'.repeat(81),
        }),
      ).toThrow('Nome deve ter entre 2 e 80 caracteres');
    });

    it('deve rejeitar caracteres inválidos', () => {
      expect(() =>
        makeUser({
          name: 'Julio123',
        }),
      ).toThrow('Nome contém caracteres inválidos');
    });

    it('deve aceitar nomes com acentos, espaços e hífen', () => {
      expect(() =>
        makeUser({
          name: "João D'Ávila-Silva",
        }),
      ).not.toThrow();
    });
  });

  describe('Validação de Email', () => {
    it('deve exigir email', () => {
      expect(() =>
        makeUser({
          email: '',
        }),
      ).toThrow('Email is required');
    });

    it('deve validar formato', () => {
      expect(() =>
        makeUser({
          email: 'teste.com',
        }),
      ).toThrow('Invalid email format');
    });

    it('deve rejeitar emails muito longos', () => {
      expect(() =>
        makeUser({
          email: `${'a'.repeat(250)} @a.com`,
        }),
      ).toThrow('Email is too long');
    });
  });

  describe('Validação de Telefone', () => {
    it('deve exigir telefone', () => {
      expect(() =>
        makeUser({
          phone: '',
        }),
      ).toThrow('Phone is required');
    });

    it('deve validar quantidade de dígitos', () => {
      expect(() =>
        makeUser({
          phone: '12345',
        }),
      ).toThrow('Phone must have 10 or 11 digits');
    });

    it('deve rejeitar sequência repetida', () => {
      expect(() =>
        makeUser({
          phone: '11111111111',
        }),
      ).toThrow('Phone cannot be a repeated sequence of digits');
    });

    it('deve validar DDD', () => {
      expect(() =>
        makeUser({
          phone: '00999999999',
        }),
      ).toThrow('Invalid DDD in phone number');
    });

    it('deve validar nono dígito', () => {
      expect(() =>
        makeUser({
          phone: '16888888888',
        }),
      ).toThrow('Mobile phones must start with 9 after DDD');
    });
  });

  describe('Validação de Senha', () => {
    it('deve exigir senha', () => {
      expect(() =>
        makeUser({
          password: undefined,
        }),
      ).toThrow('Password is required');
    });

    it('deve validar tamanho mínimo', () => {
      expect(() =>
        makeUser({
          password: 'Abc123',
        }),
      ).toThrow('Password must be between 8 and 72 characters');
    });

    it('deve exigir letra maiúscula', () => {
      expect(() =>
        makeUser({
          password: 'senha123',
        }),
      ).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      );
    });

    it('deve exigir letra minúscula', () => {
      expect(() =>
        makeUser({
          password: 'SENHA123',
        }),
      ).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      );
    });

    it('deve exigir número', () => {
      expect(() =>
        makeUser({
          password: 'SenhaTeste',
        }),
      ).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      );
    });
  });

  describe('Validação de Role', () => {
    it('deve aceitar ADMIN', () => {
      expect(() =>
        makeUser({
          role: 'ADMIN',
        }),
      ).not.toThrow();
    });

    it('deve rejeitar role inválida', () => {
      expect(() =>
        makeUser({
          role: 'CLIENT' as never,
        }),
      ).toThrow('Invalid role');
    });
  });

  describe('Validação de BarbershopId', () => {
    it('deve exigir barbershopId', () => {
      expect(() =>
        makeUser({
          barbershopId: '',
        }),
      ).toThrow('Barbershop ID is required');
    });

    it('deve validar UUID', () => {
      expect(() =>
        makeUser({
          barbershopId: '123',
        }),
      ).toThrow('Invalid Barbershop ID format');
    });
  });

  describe('Métodos de estado', () => {
    it('deve ativar usuário', () => {
      const user = makeUser({
        isActive: false,
      });

      user.activate();

      expect(user.isActive).toBe(true);
    });

    it('deve desativar usuário', () => {
      const user = makeUser();

      user.deactivate();

      expect(user.isActive).toBe(false);
    });
  });

  describe('Métodos de conveniência', () => {
    it('isAdmin deve retornar true para ADMIN', () => {
      const user = makeUser({
        role: 'ADMIN',
      });

      expect(user.isAdmin()).toBe(true);
    });

    it('isAdmin deve retornar false para BARBER', () => {
      const user = makeUser();

      expect(user.isAdmin()).toBe(false);
    });

    it('isBarber deve retornar true para BARBER', () => {
      const user = makeUser();

      expect(user.isBarber()).toBe(true);
    });

    it('isBarber deve retornar false para ADMIN', () => {
      const user = makeUser({
        role: 'ADMIN',
      });

      expect(user.isBarber()).toBe(false);
    });
  });

  describe('Setters', () => {
    it('deve alterar nome', () => {
      const user = makeUser();

      user.name = 'Carlos Souza';

      expect(user.name).toBe('Carlos Souza');
    });

    it('deve validar nome ao alterar', () => {
      const user = makeUser();

      expect(() => {
        user.name = '';
      }).toThrow('Nome é obrigatório');
    });

    it('deve alterar email', () => {
      const user = makeUser();

      user.email = 'novo@email.com';

      expect(user.email).toBe('novo@email.com');
    });

    it('deve validar email ao alterar', () => {
      const user = makeUser();

      expect(() => {
        user.email = 'emailinvalido';
      }).toThrow('Invalid email format');
    });

    it('deve alterar telefone', () => {
      const user = makeUser();

      user.phone = '16991234567';

      expect(user.phone).toBe('16991234567');
    });

    it('deve validar telefone ao alterar', () => {
      const user = makeUser();

      expect(() => {
        user.phone = '123';
      }).toThrow('Phone must have 10 or 11 digits');
    });

    it('deve alterar senha', () => {
      const user = makeUser();

      user.password = 'NovaSenha123';

      expect(user.password).toBe('NovaSenha123');
    });

    it('deve validar senha ao alterar', () => {
      const user = makeUser();

      expect(() => {
        user.password = '123';
      }).toThrow('Password must be between 8 and 72 characters');
    });

    it('deve alterar role', () => {
      const user = makeUser();

      user.role = 'ADMIN';

      expect(user.role).toBe('ADMIN');
    });
  });
});
