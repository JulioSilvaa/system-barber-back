import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import {
  requireAuth,
  requireSuperAdmin,
  requireMembership,
} from '@/infra/middleware/AuthMiddleware';

type AuthenticatedRequest = Request & {
  userId?: string;
  globalRole?: 'USER' | 'SUPER_ADMIN';
  barbershopId?: string;
  localRole?: string;
  membershipActive?: boolean;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
};

function makeValidToken(payload: object = {}): string {
  return jwt.sign(
    { sub: 'user-1', globalRole: 'USER', ...payload },
    process.env.JWT_ACCESS_SECRET as string,
  );
}

function makeResponseMock() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('Auth Middleware', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
  });

  describe('requireAuth', () => {
    it('deve retornar 401 quando o token não for fornecido', () => {
      const req = { headers: {} } as Request;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token não fornecido' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando o formato do header for inválido', () => {
      const req = { headers: { authorization: 'Bearer' } } as Request;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Formato do token inválido' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando o token for inválido ou expirado', () => {
      const req = { headers: { authorization: 'Bearer token-invalido' } } as Request;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido ou expirado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve injetar o userId e o globalRole no request e chamar next', () => {
      const token = makeValidToken();
      const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('user-1');
      expect(req.globalRole).toBe('USER');
    });
  });

  describe('requireSuperAdmin', () => {
    it('deve retornar 403 quando o usuário não é SUPER_ADMIN', () => {
      const req = { userId: 'user-1', globalRole: 'USER' } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      requireSuperAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve chamar next quando o usuário é SUPER_ADMIN', () => {
      const req = { userId: 'user-1', globalRole: 'SUPER_ADMIN' } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      requireSuperAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireMembership', () => {
    function makeMembershipRepo(membership: UserBarbershop | null) {
      return {
        findByUserAndBarbershop: vi.fn().mockResolvedValue(membership),
      } as unknown as IUserBarbershopRepository;
    }

    function makeActiveMembership(
      overrides: Partial<{ id: string; localRole: 'OWNER' | 'BARBER' }> = {},
    ) {
      return new UserBarbershop({
        id: overrides.id ?? 'membership-1',
        userId: 'user-1',
        barbershopId: 'barbershop-1',
        status: 'ACTIVE',
        localRole: overrides.localRole ?? 'BARBER',
      });
    }

    it('deve retornar 401 quando não há userId (requireAuth não executado)', async () => {
      const req = {
        params: { barbershopId: 'barbershop-1' },
        body: {},
      } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      const middleware = requireMembership(makeMembershipRepo(null));
      await middleware(req as Request, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token não fornecido' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando a barbearia não é identificada', async () => {
      const req = {
        userId: 'user-1',
        params: {},
        body: {},
      } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      const middleware = requireMembership(makeMembershipRepo(null));
      await middleware(req as Request, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Barbearia não identificada' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 403 quando o usuário não tem vínculo ativo com a barbearia', async () => {
      const req = {
        userId: 'user-1',
        params: { barbershopId: 'barbershop-1' },
        body: {},
      } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      const middleware = requireMembership(makeMembershipRepo(null));
      await middleware(req as Request, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve injetar barbershopId, localRole e membershipActive e chamar next com vínculo ativo', async () => {
      const req = {
        userId: 'user-1',
        params: { barbershopId: 'barbershop-1' },
        body: {},
      } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      const middleware = requireMembership(
        makeMembershipRepo(makeActiveMembership({ localRole: 'OWNER' })),
      );
      await middleware(req as Request, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.barbershopId).toBe('barbershop-1');
      expect(req.localRole).toBe('OWNER');
      expect(req.membershipActive).toBe(true);
    });

    it('deve permitir SUPER_ADMIN sem vínculo', async () => {
      const req = {
        userId: 'super-admin',
        globalRole: 'SUPER_ADMIN',
        params: { barbershopId: 'barbershop-1' },
        body: {},
      } as AuthenticatedRequest;
      const res = makeResponseMock();
      const next = vi.fn() as NextFunction;

      const middleware = requireMembership(makeMembershipRepo(null));
      await middleware(req as Request, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.barbershopId).toBe('barbershop-1');
      expect(req.membershipActive).toBe(true);
    });
  });
});
