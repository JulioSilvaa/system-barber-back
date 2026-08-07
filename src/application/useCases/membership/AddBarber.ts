import { randomUUID } from 'node:crypto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { UserBarbershop } from '@/domain/entities';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type AddBarberInputDTO = {
  userId: string;
  barbershopId: string;
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
      throw new Error('userId é obrigatório');
    }

    if (!input.barbershopId || input.barbershopId.trim() === '') {
      throw new Error('barbershopId é obrigatório');
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    const existing = await this.userBarbershopRepository.findByUserAndBarbershop(
      input.userId,
      input.barbershopId,
    );
    if (existing) {
      throw new Error('Vínculo já existente');
    }

    const membership = new UserBarbershop({
      id: randomUUID(),
      userId: input.userId,
      barbershopId: input.barbershopId,
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
