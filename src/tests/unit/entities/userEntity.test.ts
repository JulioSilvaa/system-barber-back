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
      ).toThrow('Email é obrigatório');
    });

    it('deve validar formato', () => {
      expect(() =>
        makeUser({
          email: 'teste.com',
        }),
      ).toThrow('Formato de email inválido');
    });

    it('deve rejeitar emails muito longos', () => {
      expect(() =>
        makeUser({
          email: `${'a'.repeat(250)} @a.com`,
        }),
      ).toThrow('Email é muito longo');
    });
  });

  describe('Validação de Telefone', () => {
    it('deve exigir telefone', () => {
      expect(() =>
        makeUser({
          phone: '',
        }),
      ).toThrow('Telefone é obrigatório');
    });

    it('deve validar quantidade de dígitos', () => {
      expect(() =>
        makeUser({
          phone: '12345',
        }),
      ).toThrow('Telefone deve ter 10 ou 11 dígitos');
    });

    it('deve rejeitar sequência repetida', () => {
      expect(() =>
        makeUser({
          phone: '11111111111',
        }),
      ).toThrow('Telefone não pode ser uma sequência repetida de dígitos');
    });

    it('deve validar DDD', () => {
      expect(() =>
        makeUser({
          phone: '00999999999',
        }),
      ).toThrow('DDD do telefone é inválido');
    });

    it('deve validar nono dígito', () => {
      expect(() =>
        makeUser({
          phone: '16888888888',
        }),
      ).toThrow('Celulares devem começar com 9 após o DDD');
    });
  });

  describe('Validação de Senha', () => {
    it('deve exigir senha', () => {
      expect(() =>
        makeUser({
          password: undefined,
        }),
      ).toThrow('Senha é obrigatória');
    });

    it('deve validar tamanho mínimo', () => {
      expect(() =>
        makeUser({
          password: 'Abc123',
        }),
      ).toThrow('Senha deve ter entre 8 e 72 caracteres');
    });

    it('deve exigir letra maiúscula', () => {
      expect(() =>
        makeUser({
          password: 'senha123',
        }),
      ).toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });

    it('deve exigir letra minúscula', () => {
      expect(() =>
        makeUser({
          password: 'SENHA123',
        }),
      ).toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });

    it('deve exigir número', () => {
      expect(() =>
        makeUser({
          password: 'SenhaTeste',
        }),
      ).toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
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
      ).toThrow('Função inválida');
    });
  });

  describe('Validação de BarbershopId', () => {
    it('deve exigir barbershopId', () => {
      expect(() =>
        makeUser({
          barbershopId: '',
        }),
      ).toThrow('ID da barbearia é obrigatório');
    });

    it('deve validar UUID', () => {
      expect(() =>
        makeUser({
          barbershopId: '123',
        }),
      ).toThrow('Formato do ID da barbearia é inválido');
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
      }).toThrow('Formato de email inválido');
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
      }).toThrow('Telefone deve ter 10 ou 11 dígitos');
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
      }).toThrow('Senha deve ter entre 8 e 72 caracteres');
    });

    it('deve alterar role', () => {
      const user = makeUser();

      user.role = 'ADMIN';

      expect(user.role).toBe('ADMIN');
    });
  });
});
