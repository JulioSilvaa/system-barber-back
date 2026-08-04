import { describe, expect, it } from 'vitest';
import { Barbershop } from '@/domain/entities/Barbershop';
import { makeBarbershopProps } from '@/tests/helpers/factories';

describe('Barbershop Entity', () => {
  describe('Criação', () => {
    it('deve criar uma barbearia válida', () => {
      const barbershop = new Barbershop(makeBarbershopProps());

      expect(barbershop).toBeInstanceOf(Barbershop);
      expect(barbershop.id).toBe('barbershop-1');
      expect(barbershop.name).toBe('Barbearia Central');
      expect(barbershop.slug).toBe('barbearia-central');
      expect(barbershop.phone).toBe('+5516999999999');
      expect(barbershop.isActive).toBe(true);
    });

    it('deve definir isActive=true por padrão', () => {
      const barbershop = new Barbershop(makeBarbershopProps({ isActive: undefined }));

      expect(barbershop.isActive).toBe(true);
    });
  });

  describe('Validação de slug', () => {
    it('deve rejeitar slug com letras maiúsculas', () => {
      expect(() => new Barbershop(makeBarbershopProps({ slug: 'Barbearia-Central' }))).toThrow(
        'slug must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('deve rejeitar slug com espaços', () => {
      expect(() => new Barbershop(makeBarbershopProps({ slug: 'barbearia central' }))).toThrow(
        'slug must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('deve rejeitar slug com caracteres especiais', () => {
      expect(() => new Barbershop(makeBarbershopProps({ slug: 'barbearia@central' }))).toThrow(
        'slug must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('deve aceitar slug com hífen e números', () => {
      expect(
        () => new Barbershop(makeBarbershopProps({ slug: 'barbearia-central-2' })),
      ).not.toThrow();
    });
  });

  describe('Validação de telefone', () => {
    it('deve rejeitar um telefone inválido', () => {
      expect(() => new Barbershop(makeBarbershopProps({ phone: '123' }))).toThrow(
        'phone must be a valid international phone number',
      );
    });

    it('deve aceitar um telefone internacional válido', () => {
      expect(() => new Barbershop(makeBarbershopProps({ phone: '+5516999999999' }))).not.toThrow();
    });
  });

  describe('Validação de senha', () => {
    it('deve rejeitar uma senha fraca', () => {
      expect(() => new Barbershop(makeBarbershopProps({ password: 'abc' }))).toThrow(
        'password must be at least 8 characters long and contain at least one letter and one number',
      );
    });

    it('deve rejeitar senha sem número', () => {
      expect(() => new Barbershop(makeBarbershopProps({ password: 'senhaforte' }))).toThrow(
        'password must be at least 8 characters long and contain at least one letter and one number',
      );
    });

    it('deve aceitar uma senha forte', () => {
      expect(() => new Barbershop(makeBarbershopProps({ password: 'SenhaForte1' }))).not.toThrow();
    });
  });
});
