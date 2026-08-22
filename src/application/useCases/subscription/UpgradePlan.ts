import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

export type UpgradePlanInput = { barbershopId: string; plan: string };

const MRR_BY_PLAN: Record<string, number> = {
  BASIC: 9990,
  PRO: 19990,
};

export default class UpgradePlanUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpgradePlanInput) {
    const { barbershopId, plan } = input;
    if (!['BASIC', 'PRO'].includes(plan)) {
      throw new ValidationError('Plano inválido. Use BASIC ou PRO.');
    }

    const barbershop = await this.prisma.barbershop.findUnique({ where: { id: barbershopId } });
    if (!barbershop) throw new NotFoundError('Barbearia não encontrada');

    const isPaidUpgrade = barbershop.plan === 'BASIC' && plan === 'PRO';
    const trialEndsAt = isPaidUpgrade ? null : barbershop.trialEndsAt;
    const newStatus = isPaidUpgrade ? 'ACTIVE' : barbershop.status;

    await this.prisma.$transaction([
      this.prisma.barbershop.update({
        where: { id: barbershopId },
        data: { plan, status: newStatus },
      }),
      this.prisma.subscription.upsert({
        where: { barbershopId },
        create: {
          id: randomUUID(),
          barbershopId,
          plan,
          status: newStatus,
          mrrCents: MRR_BY_PLAN[plan] ?? 0,
          provider: 'MANUAL',
          trialEndsAt: trialEndsAt,
        },
        update: {
          plan,
          status: newStatus,
          mrrCents: MRR_BY_PLAN[plan] ?? 0,
          trialEndsAt: trialEndsAt,
        },
      }),
    ]);

    return {
      plan,
      status: newStatus,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      mrrCents: MRR_BY_PLAN[plan] ?? 0,
    };
  }
}
