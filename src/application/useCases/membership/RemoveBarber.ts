import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export type RemoveBarberInputDTO = {
  barbershopId: string;
  membershipId: string;
};

export default class RemoveBarberUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: RemoveBarberInputDTO, auditCtx?: AuditContext): Promise<void> {
    const membership = await this.userBarbershopRepository.findById(
      input.membershipId,
      input.barbershopId,
    );
    if (!membership || membership.barbershopId !== input.barbershopId) {
      throw new NotFoundError('Vínculo não encontrado');
    }

    await this.userBarbershopRepository.delete(input.membershipId);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'DELETE',
      entityType: 'MEMBERSHIP',
      entityId: input.membershipId,
      before: { userId: membership.userId, localRole: membership.localRole },
    });
  }
}
