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
      expect(barbershop.email).toBe('contato@barbeariacentral.com');
      expect(barbershop.phone).toBe('+5516999999999');
      expect(barbershop.isActive).toBe(true);
    });

    it('deve definir isActive=true por padrão', () => {
      const barbershop = new Barbershop(makeBarbershopProps({ isActive: undefined }));

      expect(barbershop.isActive).toBe(true);
    });
  });

  describe('Validação de email', () => {
    it('deve rejeitar email inválido', () => {
      expect(() => new Barbershop(makeBarbershopProps({ email: 'email-invalido' }))).toThrow(
        'email must be a valid email address',
      );
    });

    it('deve normalizar email para minúsculas', () => {
      const barbershop = new Barbershop(
        makeBarbershopProps({ email: 'Contato@BarbeariaCentral.com' }),
      );

      expect(barbershop.email).toBe('contato@barbeariacentral.com');
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

  describe('hasActiveAccess', () => {
    it('deve retornar true quando status é ACTIVE', () => {
      const shop = new Barbershop(makeBarbershopProps({ status: 'ACTIVE' }));
      expect(shop.hasActiveAccess()).toBe(true);
    });

    it('deve retornar true quando está em TRIAL dentro do prazo', () => {
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const shop = new Barbershop(makeBarbershopProps({ status: 'TRIAL', trialEndsAt: future }));
      expect(shop.hasActiveAccess()).toBe(true);
    });

    it('deve retornar false quando está em TRIAL mas expirou', () => {
      const past = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const shop = new Barbershop(makeBarbershopProps({ status: 'TRIAL', trialEndsAt: past }));
      expect(shop.hasActiveAccess()).toBe(false);
    });

    it('deve retornar false quando status é EXPIRED', () => {
      const shop = new Barbershop(makeBarbershopProps({ status: 'EXPIRED' }));
      expect(shop.hasActiveAccess()).toBe(false);
    });

    it('deve retornar false quando status é CANCELED', () => {
      const shop = new Barbershop(makeBarbershopProps({ status: 'CANCELED' }));
      expect(shop.hasActiveAccess()).toBe(false);
    });
  });

  describe('hasMarketingModuleAccess', () => {
    it('deve retornar true quando overrideMarketingModule é true', () => {
      const shop = new Barbershop(
        makeBarbershopProps({ status: 'ACTIVE', plan: 'BASIC', overrideMarketingModule: true }),
      );
      expect(shop.hasMarketingModuleAccess()).toBe(true);
    });

    it('deve retornar true quando está em TRIAL dentro do prazo', () => {
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const shop = new Barbershop(
        makeBarbershopProps({ status: 'TRIAL', plan: 'BASIC', trialEndsAt: future }),
      );
      expect(shop.hasMarketingModuleAccess()).toBe(true);
    });

    it('deve retornar true quando plano é PRO com assinatura ativa', () => {
      const shop = new Barbershop(makeBarbershopProps({ status: 'ACTIVE', plan: 'PRO' }));
      expect(shop.hasMarketingModuleAccess()).toBe(true);
    });

    it('deve retornar false quando plano é BASIC sem override e trial expirado', () => {
      const past = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const shop = new Barbershop(
        makeBarbershopProps({ status: 'EXPIRED', plan: 'BASIC', trialEndsAt: past }),
      );
      expect(shop.hasMarketingModuleAccess()).toBe(false);
    });

    it('deve retornar false quando plano é PRO mas trial expirou e status não é ACTIVE', () => {
      const past = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const shop = new Barbershop(
        makeBarbershopProps({ status: 'EXPIRED', plan: 'PRO', trialEndsAt: past }),
      );
      expect(shop.hasMarketingModuleAccess()).toBe(false);
    });
  });

  describe('effectivePlan', () => {
    it('deve retornar PRO quando override é true', () => {
      const shop = new Barbershop(
        makeBarbershopProps({ status: 'ACTIVE', plan: 'BASIC', overrideMarketingModule: true }),
      );
      expect(shop.effectivePlan()).toBe('PRO');
    });

    it('deve retornar PRO quando plano é PRO e ativo', () => {
      const shop = new Barbershop(makeBarbershopProps({ status: 'ACTIVE', plan: 'PRO' }));
      expect(shop.effectivePlan()).toBe('PRO');
    });

    it('deve retornar BASIC quando plano é BASIC sem override', () => {
      const shop = new Barbershop(makeBarbershopProps({ status: 'ACTIVE', plan: 'BASIC' }));
      expect(shop.effectivePlan()).toBe('BASIC');
    });
  });
});
