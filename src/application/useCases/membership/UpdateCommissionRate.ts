import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export type UpdateCommissionRateInputDTO = {
  barbershopId: string;
  membershipId: string;
  commissionRate: number | null;
};

export default class UpdateCommissionRateUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(
    input: UpdateCommissionRateInputDTO,
    auditCtx?: AuditContext,
  ): Promise<UserBarbershop> {
    const membership = await this.userBarbershopRepository.findById(input.membershipId);
    if (!membership || membership.barbershopId !== input.barbershopId) {
      throw new NotFoundError('Vínculo não encontrado');
    }

    const previousRate = membership.commissionRate;
    membership.setCommissionRate(input.commissionRate);

    const saved = await this.userBarbershopRepository.save(membership);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'COMMISSION_RATE_CHANGE',
      entityType: 'MEMBERSHIP',
      entityId: saved.id,
      before: { commissionRate: previousRate },
      after: { commissionRate: saved.commissionRate },
    });

    return saved;
  }
}
