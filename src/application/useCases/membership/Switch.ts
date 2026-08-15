import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export default class SwitchBarbershopUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(
    userId: string,
    barbershopId: string,
    auditCtx?: AuditContext,
  ): Promise<UserBarbershop> {
    const memberships = await this.userBarbershopRepository.findByUserId(userId);
    const target = memberships.find(membership => membership.barbershopId === barbershopId);

    if (!target) {
      throw new NotFoundError('Vínculo não encontrado');
    }

    for (const membership of memberships) {
      if (membership.barbershopId === barbershopId) {
        membership.activate();
      } else {
        membership.deactivate();
      }
      await this.userBarbershopRepository.save(membership);
    }

    await this.auditService?.record({
      ...auditCtx,
      barbershopId,
      action: 'SWITCH',
      entityType: 'MEMBERSHIP',
      entityId: target.id,
      after: { activeBarbershopId: barbershopId },
    });

    return target;
  }
}
