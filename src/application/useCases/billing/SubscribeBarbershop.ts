import { randomUUID } from 'node:crypto';

import { getPlanPriceCents, isPlan, TRIAL_DAYS } from '@/config/plans';
import { NotFoundError, ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';
import applyPlanModules from '@/application/useCases/billing/applyPlanModules';

export type AsaasGateway = {
  createCustomer(input: { name: string; email: string; cpfCnpj: string }): Promise<{ id: string }>;
  createSubscription(input: {
    customer: string;
    billingType: 'UNDEFINED';
    value: number;
    cycle: 'MONTHLY';
    nextDueDate: string;
    description?: string;
  }): Promise<{ id: string; nextDueDate?: string }>;
  updateSubscription(
    id: string,
    input: { value?: number; nextDueDate?: string },
  ): Promise<{ id: string; nextDueDate?: string }>;
  deleteSubscription(id: string): Promise<boolean>;
};

export type SubscribeBarbershopInput = {
  barbershopId: string;
  plan: unknown;
  cpfCnpj: unknown;
};

export type SubscribeBarbershopOutput = {
  plan: string;
  providerSubscriptionId: string;
  nextDueDate: string;
  billingCycleDay: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export default class SubscribeBarbershopUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly asaasService: AsaasGateway | null,
  ) {}

  async execute(input: SubscribeBarbershopInput): Promise<SubscribeBarbershopOutput> {
    if (!this.asaasService) {
      throw new ValidationError('Gateway de pagamento não configurado');
    }
    const asaasService = this.asaasService;

    if (!isPlan(input.plan)) {
      throw new ValidationError('Plano inválido. Use BASIC ou PRO.');
    }
    const plan = input.plan;

    const cpfCnpj = sanitizeCpfCnpj(input.cpfCnpj);
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      throw new ValidationError('CPF/CNPJ inválido');
    }

    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: input.barbershopId },
      select: { id: true, name: true, email: true, isActive: true },
    });
    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }
    if (!barbershop.isActive) {
      throw new ValidationError('Barbearia desativada');
    }

    let subscription = await this.prisma.subscription.findUnique({
      where: { barbershopId: barbershop.id },
    });

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          id: randomUUID(),
          barbershopId: barbershop.id,
          plan: 'BASIC',
          status: 'TRIAL',
          mrrCents: 0,
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY_MS),
        },
      });
    }

    if (
      subscription.provider === 'ASAAS' &&
      subscription.providerSubscriptionId &&
      subscription.status !== 'CANCELED'
    ) {
      throw new ValidationError('Barbearia já possui assinatura ativa no gateway de pagamento');
    }

    let customerId = subscription.providerCustomerId;
    if (!customerId) {
      const customer = await asaasService.createCustomer({
        name: barbershop.name,
        email: barbershop.email,
        cpfCnpj,
      });
      customerId = customer.id;
    }

    const firstChargeDue = resolveFirstChargeDueDate(subscription.trialEndsAt);
    const nextDueDate = toDateOnly(firstChargeDue);
    const priceCents = getPlanPriceCents(plan);

    const remote = await asaasService.createSubscription({
      customer: customerId,
      billingType: 'UNDEFINED',
      value: priceCents / 100,
      cycle: 'MONTHLY',
      nextDueDate,
      description: `System Barber — Plano ${plan}`,
    });

    await this.prisma.subscription.update({
      where: { barbershopId: barbershop.id },
      data: {
        plan,
        provider: 'ASAAS',
        providerCustomerId: customerId,
        providerSubscriptionId: remote.id,
        billingType: 'UNDEFINED',
        billingCycleDay: firstChargeDue.getDate(),
        mrrCents: priceCents,
      },
    });

    await applyPlanModules(this.prisma, barbershop.id, plan);

    return {
      plan,
      providerSubscriptionId: remote.id,
      nextDueDate,
      billingCycleDay: firstChargeDue.getDate(),
    };
  }
}

function sanitizeCpfCnpj(raw: unknown): string {
  return String(raw ?? '').replace(/\D/g, '');
}

function resolveFirstChargeDueDate(trialEndsAt: Date | null): Date {
  const now = Date.now();
  if (trialEndsAt && trialEndsAt.getTime() > now) {
    return trialEndsAt;
  }
  return new Date(now + DAY_MS);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
