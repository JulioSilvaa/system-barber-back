import { randomUUID } from 'node:crypto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export default class OnboardUserUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(
    userId: string,
    barbershopId: string,
    auditCtx?: AuditContext,
  ): Promise<UserBarbershop> {
    const existing = await this.userBarbershopRepository.findByUserAndBarbershop(
      userId,
      barbershopId,
    );

    if (existing) {
      throw new Error('Vínculo já existente');
    }

    const membership = new UserBarbershop({ id: randomUUID(), userId, barbershopId });
    const saved = await this.userBarbershopRepository.save(membership);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId,
      action: 'CREATE',
      entityType: 'MEMBERSHIP',
      entityId: saved.id,
      after: {
        id: saved.id,
        userId: saved.userId,
        barbershopId: saved.barbershopId,
        localRole: saved.localRole,
      },
    });

    return saved;
  }
}
