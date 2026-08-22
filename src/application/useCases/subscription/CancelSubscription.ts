import type { AsaasGateway } from '@/application/useCases/billing/SubscribeBarbershop';
import { NotFoundError, ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

export default class CancelSubscriptionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly asaasService?: AsaasGateway | null,
  ) {}

  async execute(barbershopId: string) {
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId },
      select: { id: true, isActive: true },
    });

    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    if (!barbershop.isActive) {
      throw new ValidationError('Barbearia já está desativada');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { barbershopId },
    });

    if (!subscription || !['ACTIVE', 'PAST_DUE'].includes(subscription.status)) {
      throw new ValidationError('Não há assinatura ativa para cancelar');
    }

    await this.deleteRemoteSubscription(subscription.provider, subscription.providerSubscriptionId);

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { barbershopId },
        data: {
          status: 'CANCELED',
          mrrCents: 0,
        },
      }),
      this.prisma.featureFlag.updateMany({
        where: { barbershopId, source: 'PLAN' },
        data: { enabled: false },
      }),
      this.prisma.barbershop.update({
        where: { id: barbershopId },
        data: { isActive: false },
      }),
    ]);

    return { canceled: true };
  }

  private async deleteRemoteSubscription(
    provider: string,
    providerSubscriptionId: string | null,
  ): Promise<void> {
    if (!this.asaasService || provider !== 'ASAAS' || !providerSubscriptionId) {
      return;
    }

    try {
      await this.asaasService.deleteSubscription(providerSubscriptionId);
    } catch {
      // Remoção remota é best-effort; se falhar a assinatura pode ser
      // removida manualmente no painel do gateway.
    }
  }
}
