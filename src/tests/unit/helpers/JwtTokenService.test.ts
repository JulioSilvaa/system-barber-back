import { describe, expect, it } from 'vitest';
import JwtTokenService from '@/infra/helpers/JwtTokenService';

describe('JwtTokenService', () => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

  const service = new JwtTokenService();
  const payload = { sub: 'shop-1', actor: 'BARBERSHOP' as const };

  describe('verify', () => {
    it('deve validar token de acesso com o secret de acesso', () => {
      const accessToken = service.sign(payload, '30m');

      expect(service.verify(accessToken)).toEqual(
        expect.objectContaining({ sub: 'shop-1', actor: 'BARBERSHOP' }),
      );
    });

    it('deve rejeitar token de refresh quando esperado access', () => {
      const refreshToken = service.sign(payload, '7d');

      expect(() => service.verify(refreshToken)).toThrow();
    });

    it('deve validar token de refresh com o secret de refresh', () => {
      const refreshToken = service.sign(payload, '7d');

      expect(service.verify(refreshToken, 'refresh')).toEqual(
        expect.objectContaining({ sub: 'shop-1', actor: 'BARBERSHOP' }),
      );
    });

    it('deve rejeitar token de acesso quando esperado refresh', () => {
      const accessToken = service.sign(payload, '30m');

      expect(() => service.verify(accessToken, 'refresh')).toThrow();
    });
  });
});
