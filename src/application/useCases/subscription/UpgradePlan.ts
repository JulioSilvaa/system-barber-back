import { randomUUID } from 'node:crypto';

import applyPlanModules from '@/application/useCases/billing/applyPlanModules';
import type { AsaasGateway } from '@/application/useCases/billing/SubscribeBarbershop';
import { getPlanPriceCents, isPlan, PLAN_MODULES, type Plan } from '@/config/plans';
import { NotFoundError, ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

export type UpgradePlanInput = {
  barbershopId: string;
  plan: string;
};

export default class UpgradePlanUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly asaasService?: AsaasGateway | null,
  ) {}

  async execute(input: UpgradePlanInput) {
    const { barbershopId } = input;

    if (!isPlan(input.plan)) {
      throw new ValidationError('Plano inválido. Use BASIC ou PRO.');
    }
    const plan = input.plan;

    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId },
      select: { id: true, isActive: true },
    });

    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    if (!barbershop.isActive) {
      throw new ValidationError('Barbearia desativada');
    }

    const priceCents = getPlanPriceCents(plan);
    const subscription = await this.prisma.subscription.findUnique({
      where: { barbershopId },
    });

    if (subscription) {
      const data: {
        plan: string;
        mrrCents: number;
        status?: string;
        trialEndsAt?: Date;
      } = { plan, mrrCents: priceCents };

      // Trial só é definido na criação; troca de plano não reinicia o período.
      if (!subscription.trialEndsAt) {
        data.trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      // Fora do trial, plano pago implica assinatura ativa.
      if (
        subscription.provider === 'ASAAS' &&
        ['ACTIVE', 'PAST_DUE'].includes(subscription.status)
      ) {
        data.status = 'ACTIVE';
      }

      await this.prisma.subscription.update({ where: { barbershopId }, data });
    } else {
      await this.prisma.subscription.create({
        data: {
          id: randomUUID(),
          barbershopId,
          plan,
          status: 'TRIAL',
          mrrCents: 0,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    await this.updateRemoteSubscriptionValue(barbershopId, plan);

    await applyPlanModules(this.prisma, barbershopId, plan);

    return {
      plan,
      mrrCents: priceCents,
      modules: PLAN_MODULES[plan] ?? [],
    };
  }

  private async updateRemoteSubscriptionValue(barbershopId: string, plan: Plan): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { barbershopId },
    });

    if (
      !this.asaasService ||
      !subscription?.providerSubscriptionId ||
      subscription.provider !== 'ASAAS' ||
      subscription.status === 'CANCELED'
    ) {
      return;
    }

    try {
      await this.asaasService.updateSubscription(subscription.providerSubscriptionId, {
        value: getPlanPriceCents(plan) / 100,
      });
    } catch {
      // Ajuste remoto é best-effort; a cobrança seguinte pode ser corrigida
      // manualmente no painel do gateway.
    }
  }
}
