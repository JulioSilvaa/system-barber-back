import { describe, expect, it } from 'vitest';
import User from '@/domain/entities/User';
import { makeUserProps } from '@/tests/helpers/factories';

describe('User Entity', () => {
  describe('Criação', () => {
    it('deve criar um usuário global válido sem vínculo com barbearia', () => {
      const user = User.create(makeUserProps());

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe('user-1');
      expect(user.name).toBe('João da Silva');
      expect(user.email).toBe('joao@example.com');
      expect(user.phone).toBe('16999999999');
      expect(user.isActive).toBe(true);
      expect(user).not.toHaveProperty('barbershopId');
      expect(user).not.toHaveProperty('role');
    });

    it('deve definir isActive=true por padrão', () => {
      const user = User.create(makeUserProps({ isActive: undefined }));

      expect(user.isActive).toBe(true);
    });
  });

  describe('Validação de Nome', () => {
    it('deve exigir nome', () => {
      expect(() => User.create(makeUserProps({ name: '' }))).toThrow('Nome é obrigatório');
    });

    it('deve exigir no mínimo 2 caracteres', () => {
      expect(() => User.create(makeUserProps({ name: 'A' }))).toThrow(
        'Nome deve ter entre 2 e 80 caracteres',
      );
    });

    it('deve exigir no máximo 80 caracteres', () => {
      expect(() => User.create(makeUserProps({ name: 'A'.repeat(81) }))).toThrow(
        'Nome deve ter entre 2 e 80 caracteres',
      );
    });

    it('deve rejeitar caracteres inválidos', () => {
      expect(() => User.create(makeUserProps({ name: 'Julio123' }))).toThrow(
        'Nome contém caracteres inválidos',
      );
    });

    it('deve aceitar nomes com acentos, espaços e hífen', () => {
      expect(() => User.create(makeUserProps({ name: "João D'Ávila-Silva" }))).not.toThrow();
    });
  });

  describe('Validação de Email', () => {
    it('deve exigir email', () => {
      expect(() => User.create(makeUserProps({ email: '' }))).toThrow('Email é obrigatório');
    });

    it('deve validar formato', () => {
      expect(() => User.create(makeUserProps({ email: 'teste.com' }))).toThrow(
        'Formato de email inválido',
      );
    });

    it('deve rejeitar emails muito longos', () => {
      expect(() => User.create(makeUserProps({ email: `${'a'.repeat(250)}@a.com` }))).toThrow(
        'Email é muito longo',
      );
    });
  });

  describe('Validação de Telefone', () => {
    it('deve exigir telefone', () => {
      expect(() => User.create(makeUserProps({ phone: '' }))).toThrow('Telefone é obrigatório');
    });

    it('deve validar quantidade de dígitos', () => {
      expect(() => User.create(makeUserProps({ phone: '12345' }))).toThrow(
        'Telefone deve ter 10 ou 11 dígitos',
      );
    });

    it('deve rejeitar sequência repetida', () => {
      expect(() => User.create(makeUserProps({ phone: '11111111111' }))).toThrow(
        'Telefone não pode ser uma sequência repetida de dígitos',
      );
    });

    it('deve validar DDD', () => {
      expect(() => User.create(makeUserProps({ phone: '00999999999' }))).toThrow(
        'DDD do telefone é inválido',
      );
    });

    it('deve validar nono dígito', () => {
      expect(() => User.create(makeUserProps({ phone: '16888888888' }))).toThrow(
        'Celulares devem começar com 9 após o DDD',
      );
    });
  });

  describe('Validação de Senha', () => {
    it('deve exigir senha', () => {
      expect(() => User.create(makeUserProps({ password: undefined }))).toThrow(
        'Senha é obrigatória',
      );
    });

    it('deve validar tamanho mínimo', () => {
      expect(() => User.create(makeUserProps({ password: 'Abc123' }))).toThrow(
        'Senha deve ter entre 8 e 72 caracteres',
      );
    });

    it('deve exigir letra maiúscula', () => {
      expect(() => User.create(makeUserProps({ password: 'senha123' }))).toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });

    it('deve exigir letra minúscula', () => {
      expect(() => User.create(makeUserProps({ password: 'SENHA123' }))).toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });

    it('deve exigir número', () => {
      expect(() => User.create(makeUserProps({ password: 'SenhaTeste' }))).toThrow(
        'Senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
      );
    });
  });

  describe('Métodos de estado', () => {
    it('deve ativar usuário', () => {
      const user = User.create(makeUserProps({ isActive: false }));

      user.activate();

      expect(user.isActive).toBe(true);
    });

    it('deve desativar usuário', () => {
      const user = User.create(makeUserProps());

      user.deactivate();

      expect(user.isActive).toBe(false);
    });
  });

  describe('Setters', () => {
    it('deve alterar nome', () => {
      const user = User.create(makeUserProps());

      user.name = 'Carlos Souza';

      expect(user.name).toBe('Carlos Souza');
    });

    it('deve validar nome ao alterar', () => {
      const user = User.create(makeUserProps());

      expect(() => {
        user.name = '';
      }).toThrow('Nome é obrigatório');
    });

    it('deve alterar email', () => {
      const user = User.create(makeUserProps());

      user.email = 'novo@email.com';

      expect(user.email).toBe('novo@email.com');
    });

    it('deve validar email ao alterar', () => {
      const user = User.create(makeUserProps());

      expect(() => {
        user.email = 'emailinvalido';
      }).toThrow('Formato de email inválido');
    });

    it('deve alterar telefone', () => {
      const user = User.create(makeUserProps());

      user.phone = '16991234567';

      expect(user.phone).toBe('16991234567');
    });

    it('deve validar telefone ao alterar', () => {
      const user = User.create(makeUserProps());

      expect(() => {
        user.phone = '123';
      }).toThrow('Telefone deve ter 10 ou 11 dígitos');
    });

    it('deve alterar senha', () => {
      const user = User.create(makeUserProps());

      user.password = 'NovaSenha123';

      expect(user.password).toBe('NovaSenha123');
    });

    it('deve validar senha ao alterar', () => {
      const user = User.create(makeUserProps());

      expect(() => {
        user.password = '123';
      }).toThrow('Senha deve ter entre 8 e 72 caracteres');
    });
  });
});
