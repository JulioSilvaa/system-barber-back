import { describe, expect, it } from 'vitest';
import UserBarbershop, {
  LocalBarbershopRole,
  MembershipStatus,
} from '@/domain/entities/UserBarbershop';
import { makeUserBarbershopProps } from '@/tests/helpers/factories';

describe('UserBarbershop Entity', () => {
  describe('Criação', () => {
    it('deve criar um vínculo válido entre usuário e barbearia', () => {
      const membership = new UserBarbershop(makeUserBarbershopProps());

      expect(membership).toBeInstanceOf(UserBarbershop);
      expect(membership.id).toBe('membership-1');
      expect(membership.userId).toBe('user-1');
      expect(membership.barbershopId).toBe('barbershop-1');
      expect(membership.status).toBe('ACTIVE');
    });

    it('deve definir ACTIVE como status padrão', () => {
      const membership = new UserBarbershop(makeUserBarbershopProps({ status: undefined }));

      expect(membership.status).toBe('ACTIVE');
    });

    it('deve aceitar status INACTIVE', () => {
      const membership = new UserBarbershop(makeUserBarbershopProps({ status: 'INACTIVE' }));

      expect(membership.status).toBe('INACTIVE');
    });
  });

  describe('Papel local (localRole)', () => {
    it('deve definir BARBER como localRole padrão', () => {
      const membership = new UserBarbershop(makeUserBarbershopProps({ localRole: undefined }));

      expect(membership.localRole).toBe('BARBER');
    });

    it('deve rejeitar um localRole inválido', () => {
      expect(
        () =>
          new UserBarbershop({
            id: 'membership-1',
            userId: 'user-1',
            barbershopId: 'barbershop-1',
            localRole: 'ADMIN' as LocalBarbershopRole,
          }),
      ).toThrow('Papel local inválido');
    });

    it('isBarber e isOwner devem refletir o papel local', () => {
      const barber = new UserBarbershop(makeUserBarbershopProps({ localRole: 'BARBER' }));

      expect(barber.isBarber()).toBe(true);
      expect(barber.isOwner()).toBe(false);
    });
  });

  describe('Validação de campos obrigatórios', () => {
    it('deve exigir userId', () => {
      expect(() => new UserBarbershop(makeUserBarbershopProps({ userId: '' }))).toThrow(
        'ID do usuário é obrigatório',
      );
    });

    it('deve exigir barbershopId', () => {
      expect(() => new UserBarbershop(makeUserBarbershopProps({ barbershopId: '' }))).toThrow(
        'ID da barbearia é obrigatório',
      );
    });
  });

  describe('Validação de status', () => {
    it('deve rejeitar um status inválido', () => {
      expect(
        () =>
          new UserBarbershop(makeUserBarbershopProps({ status: 'PENDING' as MembershipStatus })),
      ).toThrow('Status de membro inválido');
    });
  });

  describe('Métodos de estado', () => {
    it('deve ativar o vínculo', () => {
      const membership = new UserBarbershop(makeUserBarbershopProps({ status: 'INACTIVE' }));

      membership.activate();

      expect(membership.status).toBe('ACTIVE');
    });

    it('deve desativar o vínculo', () => {
      const membership = new UserBarbershop(makeUserBarbershopProps());

      membership.deactivate();

      expect(membership.status).toBe('INACTIVE');
    });

    it('isActive deve refletir o status', () => {
      const active = new UserBarbershop(makeUserBarbershopProps());
      const inactive = new UserBarbershop(makeUserBarbershopProps({ status: 'INACTIVE' }));

      expect(active.isActive()).toBe(true);
      expect(inactive.isActive()).toBe(false);
    });
  });
});
