import { Request, Response, Router } from 'express';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import { ITokenService, TokenActor } from '@/domain/repository/TokenService';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '@/infra/http/helpers/authCookie';

export default function createAuthRoutes(deps?: { tokenService?: ITokenService }) {
  const router = Router();
  const tokenService = deps?.tokenService ?? new JwtTokenService();

  router.post(
    '/auth/refresh',
    ExpressAdapter.create(async (req: Request, res: Response) => {
      const refreshToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];

      if (!refreshToken) {
        return res.status(401).json({ message: 'Token não fornecido' });
      }

      let payload;
      try {
        payload = tokenService.verify(refreshToken, 'refresh');
      } catch {
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
      }

      if (!payload.sub || !payload.actor) {
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
      }

      const claims = {
        sub: payload.sub,
        actor: payload.actor as TokenActor,
        barbershopId: payload.barbershopId,
        localRole: payload.localRole,
      };

      setAuthCookies(res, tokenService.sign(claims, '30m'), tokenService.sign(claims, '7d'));

      return res.status(200).json({ ok: true });
    }),
  );

  return router;
}
