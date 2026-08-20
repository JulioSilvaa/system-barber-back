import { NotFoundError } from '@/domain/errors';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { IFeatureFlagRepository } from '@/domain/repository/FeatureFlagRepository';
import type { PrismaClient } from '@/generated/prisma/client';

export type GetSubscriptionOutput = {
  plan: string;
  enabledModules: string[];
};

export default class GetSubscriptionUseCase {
  constructor(
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly featureFlagRepository: IFeatureFlagRepository,
    private readonly prisma: PrismaClient,
  ) {}

  async execute(barbershopId: string): Promise<GetSubscriptionOutput> {
    const barbershop = await this.barbershopRepository.findById(barbershopId);
    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { barbershopId },
      select: { plan: true, status: true },
    });

    const plan = subscription?.plan ?? 'BASIC';
    const enabledModules = await this.featureFlagRepository.findEnabledByBarbershop(barbershopId);

    return { plan, enabledModules };
  }
}
