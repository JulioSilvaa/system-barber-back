import { NextFunction, Request, Response } from 'express';
import GetSubscriptionUseCase from '@/application/useCases/subscription/GetSubscription';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { IFeatureFlagRepository } from '@/domain/repository/FeatureFlagRepository';
import type { PrismaClient } from '@/generated/prisma/client';

export default class SubscriptionController {
  private readonly getSubscriptionUseCase: GetSubscriptionUseCase;

  constructor(
    barbershopRepository: IBarbershopRepository,
    featureFlagRepository: IFeatureFlagRepository,
    prisma: PrismaClient,
  ) {
    this.getSubscriptionUseCase = new GetSubscriptionUseCase(
      barbershopRepository,
      featureFlagRepository,
      prisma,
    );
  }

  getByBarbershop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.barbershopId;
      const barbershopId = Array.isArray(rawId) ? rawId[0] : rawId;
      const result = await this.getSubscriptionUseCase.execute(barbershopId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
