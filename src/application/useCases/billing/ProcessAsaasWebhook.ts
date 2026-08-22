import { getPlanPriceCents, isPlan } from '@/config/plans';
import type { PrismaClient } from '@/generated/prisma/client';

export type ProcessAsaasWebhookInput = {
  event?: unknown;
  payment?: {
    id?: string;
    subscription?: string | null;
    nextDueDate?: string | null;
    dueDate?: string | null;
  } | null;
};

export type ProcessAsaasWebhookOutput = {
  processed: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVATE_EVENTS = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']);
const OVERDUE_EVENTS = new Set(['PAYMENT_OVERDUE']);
const CANCEL_EVENTS = new Set(['PAYMENT_REFUNDED', 'PAYMENT_DELETED']);

export default class ProcessAsaasWebhookUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ProcessAsaasWebhookInput): Promise<ProcessAsaasWebhookOutput> {
    const event = typeof input.event === 'string' ? input.event : '';
    const remoteSubscriptionId = input.payment?.subscription;

    if (!event || !remoteSubscriptionId) {
      return { processed: false };
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { provider: 'ASAAS', providerSubscriptionId: remoteSubscriptionId },
    });

    if (!subscription) {
      return { processed: false };
    }

    if (ACTIVATE_EVENTS.has(event)) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          mrrCents: isPlan(subscription.plan) ? getPlanPriceCents(subscription.plan) : 0,
          currentPeriodEnd: resolvePeriodEnd(input.payment?.nextDueDate ?? input.payment?.dueDate),
        },
      });
      return { processed: true };
    }

    if (OVERDUE_EVENTS.has(event)) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });
      return { processed: true };
    }

    if (CANCEL_EVENTS.has(event)) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELED', mrrCents: 0 },
      });
      return { processed: true };
    }

    return { processed: false };
  }
}

function resolvePeriodEnd(nextDueDate: string | null | undefined): Date {
  if (nextDueDate) {
    const parsed = new Date(`${nextDueDate}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(Date.now() + DAY_MS);
}
