import { NextFunction, Request, Response } from 'express';
import SubscribeBarbershopUseCase from '@/application/useCases/billing/SubscribeBarbershop';
import GetSubscriptionUseCase from '@/application/useCases/subscription/GetSubscription';
import UpgradePlanUseCase from '@/application/useCases/subscription/UpgradePlan';
import CancelSubscriptionUseCase from '@/application/useCases/subscription/CancelSubscription';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { IFeatureFlagRepository } from '@/domain/repository/FeatureFlagRepository';
import type { PrismaClient } from '@/generated/prisma/client';
import { createAsaasService } from '@/infra/services/AsaasService';

export default class SubscriptionController {
  private readonly getSubscriptionUseCase: GetSubscriptionUseCase;
  private readonly upgradePlanUseCase: UpgradePlanUseCase;
  private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase;
  private readonly subscribeUseCase: SubscribeBarbershopUseCase;

  constructor(
    barbershopRepository: IBarbershopRepository,
    featureFlagRepository: IFeatureFlagRepository,
    prisma: PrismaClient,
  ) {
    const asaasService = createAsaasService();

    this.getSubscriptionUseCase = new GetSubscriptionUseCase(
      barbershopRepository,
      featureFlagRepository,
      prisma,
    );
    this.upgradePlanUseCase = new UpgradePlanUseCase(prisma, asaasService);
    this.cancelSubscriptionUseCase = new CancelSubscriptionUseCase(prisma, asaasService);
    this.subscribeUseCase = new SubscribeBarbershopUseCase(prisma, asaasService);
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

  upgrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.barbershopId;
      const barbershopId = Array.isArray(rawId) ? rawId[0] : rawId;
      const { plan } = req.body ?? {};
      const result = await this.upgradePlanUseCase.execute({ barbershopId, plan });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.barbershopId;
      const barbershopId = Array.isArray(rawId) ? rawId[0] : rawId;
      const result = await this.cancelSubscriptionUseCase.execute(barbershopId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  subscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.barbershopId;
      const barbershopId = Array.isArray(rawId) ? rawId[0] : rawId;
      const { plan, cpfCnpj } = req.body ?? {};
      const result = await this.subscribeUseCase.execute({ barbershopId, plan, cpfCnpj });
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}
