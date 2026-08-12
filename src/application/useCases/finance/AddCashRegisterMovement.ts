import { randomUUID } from 'node:crypto';

import AuditService, { AuditContext } from '@/application/services/AuditService';
import { CashRegister } from '@/domain/entities';
import { CashRegisterMovement } from '@/domain/entities';
import {
  CashRegisterMovementCategory,
  CashRegisterMovementKind,
} from '@/domain/entities/CashRegisterMovement';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';

export type AddCashRegisterMovementInputDTO = {
  barbershopId: string;
  cashRegisterId?: string;
  kind: CashRegisterMovementKind;
  category: CashRegisterMovementCategory;
  amountCents: number;
  description?: string | null;
  appointmentId?: string | null;
};

export default class AddCashRegisterMovementUseCase {
  constructor(
    private readonly cashRegisterRepository: ICashRegisterRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(
    input: AddCashRegisterMovementInputDTO,
    auditCtx?: AuditContext,
  ): Promise<CashRegisterMovement> {
    const register = await this.resolveRegister(input);

    if (!register.isOpen()) {
      throw new Error('Não é possível movimentar um caixa fechado');
    }

    const movement = new CashRegisterMovement({
      id: randomUUID(),
      cashRegisterId: register.id,
      barbershopId: input.barbershopId,
      kind: input.kind,
      category: input.category,
      amountCents: input.amountCents,
      description: input.description ?? null,
      appointmentId: input.appointmentId ?? null,
    });

    const saved = await this.cashRegisterRepository.saveMovement(movement);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'MOVEMENT',
      entityType: 'CASH_REGISTER_MOVEMENT',
      entityId: saved.id,
      after: {
        id: saved.id,
        cashRegisterId: saved.cashRegisterId,
        kind: saved.kind,
        category: saved.category,
        amountCents: saved.amountCents,
      },
    });

    return saved;
  }

  private async resolveRegister(input: AddCashRegisterMovementInputDTO): Promise<CashRegister> {
    const register = input.cashRegisterId
      ? await this.cashRegisterRepository.findById(input.cashRegisterId, input.barbershopId)
      : await this.cashRegisterRepository.findOpenByBarbershop(input.barbershopId);

    if (!register) {
      throw new Error('Não há caixa aberto para esta barbearia');
    }

    return register;
  }
}
