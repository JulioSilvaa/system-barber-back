import { NotFoundError, ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

export default class CancelSubscriptionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(barbershopId: string) {
    const barbershop = await this.prisma.barbershop.findUnique({ where: { id: barbershopId } });
    if (!barbershop) throw new NotFoundError('Barbearia não encontrada');
    if (!barbershop.isActive) throw new ValidationError('Barbearia já está desativada');

    const subscription = await this.prisma.subscription.findUnique({ where: { barbershopId } });
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ValidationError('Não há assinatura ativa para cancelar');
    }

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { barbershopId },
        data: { status: 'CANCELED', mrrCents: 0 },
      }),
      this.prisma.featureFlag.updateMany({
        where: { barbershopId, source: 'PLAN' },
        data: { enabled: false },
      }),
      this.prisma.barbershop.update({
        where: { id: barbershopId },
        data: { status: 'CANCELED', isActive: false },
      }),
    ]);

    return { canceled: true };
  }
}
