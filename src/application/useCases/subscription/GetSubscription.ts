import { NotFoundError } from '@/domain/errors';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type GetSubscriptionOutput = {
  plan: string;
  effectivePlan: string;
  enabledModules: string[];
  status: string;
  trialEndsAt: string | null;
  hasActiveAccess: boolean;
};

export default class GetSubscriptionUseCase {
  constructor(private readonly barbershopRepository: IBarbershopRepository) {}

  async execute(barbershopId: string): Promise<GetSubscriptionOutput> {
    const barbershop = await this.barbershopRepository.findById(barbershopId);
    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    const effective = barbershop.effectivePlan();
    const hasActiveAccess = barbershop.hasActiveAccess();

    const enabledModules = hasActiveAccess
      ? effective === 'PRO'
        ? ['COPILOT', 'WHATSAPP', 'MARKETING']
        : ['COPILOT', 'WHATSAPP']
      : [];

    return {
      plan: barbershop.plan,
      effectivePlan: effective,
      enabledModules,
      status: barbershop.status,
      trialEndsAt: barbershop.trialEndsAt?.toISOString() ?? null,
      hasActiveAccess,
    };
  }
}
