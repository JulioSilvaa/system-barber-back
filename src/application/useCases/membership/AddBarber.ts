import { ValidationError, NotFoundError } from '@/domain/errors';
import { randomUUID } from 'node:crypto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type AddBarberInputDTO = {
  userId: string;
  barbershopId: string;
  commissionRate?: number | null;
};

export default class AddBarberToBarbershopUseCase {
  constructor(
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly userRepository: IUserRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: AddBarberInputDTO, auditCtx?: AuditContext): Promise<UserBarbershop> {
    if (!input.userId || input.userId.trim() === '') {
      throw new ValidationError('userId é obrigatório');
    }

    if (!input.barbershopId || input.barbershopId.trim() === '') {
      throw new ValidationError('barbershopId é obrigatório');
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new NotFoundError('Barbearia não encontrada');
    }

    const existing = await this.userBarbershopRepository.findByUserAndBarbershop(
      input.userId,
      input.barbershopId,
    );
    if (existing) {
      throw new ValidationError('Vínculo já existente');
    }

    const membership = new UserBarbershop({
      id: randomUUID(),
      userId: input.userId,
      barbershopId: input.barbershopId,
      commissionRate: input.commissionRate ?? null,
    });
    const saved = await this.userBarbershopRepository.save(membership);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
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
