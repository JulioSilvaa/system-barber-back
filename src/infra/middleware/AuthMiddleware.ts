import { NextFunction, Request, Response } from 'express';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { ITokenService } from '@/domain/repository/TokenService';
import JwtTokenService from '@/infra/helpers/JwtTokenService';
import { ACCESS_COOKIE } from '@/infra/http/helpers/authCookie';

function paramString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function resolveBarbershop(barbershopRepository: IBarbershopRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = paramString(req.params.identifier) ?? paramString(req.params.barbershopId);

    if (!identifier) {
      return res.status(400).json({ message: 'Barbearia não identificada' });
    }

    const barbershop =
      (await barbershopRepository.findById(identifier)) ??
      (await barbershopRepository.findBySlug(identifier));

    if (!barbershop) {
      return res.status(404).json({ message: 'Barbearia não encontrada' });
    }

    if (!barbershop.isActive) {
      return res.status(404).json({ message: 'Barbearia inativa' });
    }

    req.barbershopId = barbershop.id;
    return next();
  };
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  tokenService: ITokenService = new JwtTokenService(),
) {
  const authHeader = req.headers.authorization;
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];

  const token = authHeader ? authHeader.split(' ')[1] : cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const decoded = tokenService.verify(token, 'access');

    req.userId = decoded.sub;
    req.actor = decoded.actor ?? 'USER';

    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.actor !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  return next();
}

export function requireMembership(
  userBarbershopRepository: IUserBarbershopRepository,
  barbershopRepository?: IBarbershopRepository,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const barbershopId =
      paramString(req.params.barbershopId) ?? paramString(req.body?.barbershopId);

    if (req.actor === 'BARBERSHOP') {
      if (!req.userId) {
        return res.status(401).json({ message: 'Token não fornecido' });
      }

      if (!barbershopId) {
        return res.status(400).json({ message: 'Barbearia não identificada' });
      }

      if (req.userId !== barbershopId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const isActive = await isBarbershopActive(barbershopRepository, barbershopId);
      if (!isActive) {
        return res.status(403).json({ message: 'Barbearia inativa' });
      }

      req.barbershopId = barbershopId;
      req.localRole = 'OWNER';
      req.membershipActive = true;

      return next();
    }

    if (!req.userId) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

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

    const isActive = await isBarbershopActive(barbershopRepository, barbershopId);
    if (!isActive) {
      return res.status(403).json({ message: 'Barbearia inativa' });
    }

    req.barbershopId = barbershopId;
    req.localRole = membership.localRole;
    req.membershipActive = true;

    return next();
  };
}

async function isBarbershopActive(
  barbershopRepository: IBarbershopRepository | undefined,
  barbershopId: string,
): Promise<boolean> {
  if (!barbershopRepository) {
    return true;
  }

  const barbershop = await barbershopRepository.findById(barbershopId);
  return barbershop?.isActive === true;
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.localRole === 'OWNER') {
    return next();
  }

  return res.status(403).json({ message: 'Acesso negado' });
}

export function requireBarbershopSelf(req: Request, res: Response, next: NextFunction) {
  if (req.actor !== 'BARBERSHOP') {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const barbershopId =
    paramString(req.params.barbershopId) ?? paramString(req.params.id) ?? paramString(req.body?.barbershopId);

  if (!barbershopId || req.userId !== barbershopId) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  req.barbershopId = barbershopId;
  return next();
}
