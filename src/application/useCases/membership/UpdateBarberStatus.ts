import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export type UpdateBarberStatusInputDTO = {
  barbershopId: string;
  membershipId: string;
  isActive: boolean;
};

export default class UpdateBarberStatusUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(
    input: UpdateBarberStatusInputDTO,
    auditCtx?: AuditContext,
  ): Promise<UserBarbershop> {
    const membership = await this.userBarbershopRepository.findById(input.membershipId);
    if (!membership || membership.barbershopId !== input.barbershopId) {
      throw new NotFoundError('Vínculo não encontrado');
    }

    const previousStatus = membership.status;
    if (input.isActive) {
      membership.activate();
    } else {
      membership.deactivate();
    }

    const saved = await this.userBarbershopRepository.save(membership);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'STATUS_CHANGE',
      entityType: 'MEMBERSHIP',
      entityId: saved.id,
      before: { status: previousStatus },
      after: { status: saved.status },
    });

    return saved;
  }
}
