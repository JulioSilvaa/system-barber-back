import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

interface IPayload {
  sub: string;
  globalRole?: 'USER' | 'SUPER_ADMIN';
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Formato do token inválido' });
  }

  if (!process.env.JWT_ACCESS_SECRET) {
    return res.status(500).json({ message: 'Erro de configuração do servidor' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as IPayload;

    req.userId = decoded.sub;
    req.globalRole = decoded.globalRole ?? 'USER';

    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.globalRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  return next();
}

export function requireMembership(userBarbershopRepository: IUserBarbershopRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.globalRole === 'SUPER_ADMIN') {
      const barbershopId = req.params.barbershopId ?? req.body?.barbershopId;

      if (barbershopId) {
        req.barbershopId = barbershopId;
      }

      req.membershipActive = true;
      return next();
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const barbershopId = req.params.barbershopId ?? req.body?.barbershopId;

    if (!barbershopId) {
      return res.status(400).json({ message: 'Barbearia não identificada' });
    }

    const membership = await userBarbershopRepository.findByUserAndBarbershop(
      req.userId,
      barbershopId,
    );

    if (!membership || !membership.isActive()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    req.barbershopId = barbershopId;
    req.localRole = membership.localRole;
    req.membershipActive = true;

    return next();
  };
}

export function requireSuperAdminOrOwner(userBarbershopRepository: IUserBarbershopRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.globalRole === 'SUPER_ADMIN') {
      return next();
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const memberships = await userBarbershopRepository.findByUserId(req.userId);
    const barbershopId: string | undefined = req.body?.barbershopId;

    const isOwner = barbershopId
      ? memberships.some(
          membership => membership.barbershopId === barbershopId && membership.isOwner(),
        )
      : memberships.some(membership => membership.isOwner());

    if (!isOwner) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    return next();
  };
}
