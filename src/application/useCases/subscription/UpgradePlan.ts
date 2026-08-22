import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

const PLAN_MODULES: Record<string, string[]> = {
  BASIC: [],
  PRO: ['COPILOT', 'WHATSAPP', 'MARKETING'],
};

export type UpgradePlanInput = {
  barbershopId: string;
  plan: string;
};

export default class UpgradePlanUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpgradePlanInput) {
    const { barbershopId, plan } = input;

    if (!['BASIC', 'PRO'].includes(plan)) {
      throw new ValidationError('Plano inválido. Use BASIC ou PRO.');
    }

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

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const existing = await this.prisma.subscription.findUnique({
      where: { barbershopId },
    });

    if (!existing) {
      await this.prisma.subscription.create({
        data: {
          id: randomUUID(),
          barbershopId,
          plan,
          status: 'ACTIVE',
          mrrCents: plan === 'PRO' ? 4990 : 0,
          trialEndsAt,
        },
      });
    } else {
      await this.prisma.subscription.update({
        where: { barbershopId },
        data: {
          plan,
          status: 'ACTIVE',
          mrrCents: plan === 'PRO' ? 4990 : 0,
          trialEndsAt,
        },
      });
    }

    const modules = PLAN_MODULES[plan] ?? [];
    for (const mod of modules) {
      await this.prisma.featureFlag.upsert({
        where: { barbershopId_module: { barbershopId, module: mod } },
        create: { id: randomUUID(), barbershopId, module: mod, enabled: true, source: 'PLAN' },
        update: { enabled: true, source: 'PLAN' },
      });
    }

    const otherModules = Object.values(PLAN_MODULES)
      .flat()
      .filter(m => !modules.includes(m));

    for (const mod of otherModules) {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { barbershopId_module: { barbershopId, module: mod } },
      });
      if (flag && flag.source === 'PLAN') {
        await this.prisma.featureFlag.update({
          where: { id: flag.id },
          data: { enabled: false },
        });
      }
    }

    return {
      plan,
      trialEndsAt: trialEndsAt.toISOString(),
    };
  }
}
