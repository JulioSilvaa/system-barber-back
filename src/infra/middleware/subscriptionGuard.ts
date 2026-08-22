import { NextFunction, Request, Response } from 'express';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export default function subscriptionGuard(barbershopRepository: IBarbershopRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = req.user?.barbershopId;
      if (!barbershopId) {
        return next();
      }

      const barbershop = await barbershopRepository.findById(barbershopId);
      if (!barbershop) {
        return res.status(402).json({
          error: 'PAYMENT_REQUIRED',
          message: 'Barbearia não encontrada. Assine um plano para continuar.',
          url: '/planos',
        });
      }

      if (!barbershop.hasActiveAccess()) {
        return res.status(402).json({
          error: 'PAYMENT_REQUIRED',
          message: 'Sua assinatura expirou ou foi cancelada. Assine um plano para continuar.',
          url: '/planos',
          status: barbershop.status,
          plan: barbershop.plan,
          trialEndsAt: barbershop.trialEndsAt?.toISOString() ?? null,
        });
      }

      req.user = {
        ...req.user,
        plan: barbershop.plan,
        effectivePlan: barbershop.effectivePlan(),
        hasMarketingAccess: barbershop.hasMarketingModuleAccess(),
      };

      return next();
    } catch {
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'Erro ao verificar assinatura. Assine um plano para continuar.',
        url: '/planos',
      });
    }
  };
}
