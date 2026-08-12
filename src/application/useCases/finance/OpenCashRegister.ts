import { randomUUID } from 'node:crypto';

import AuditService, { AuditContext } from '@/application/services/AuditService';
import { localDateKey } from '@/application/services/dateKey';
import { CashRegister } from '@/domain/entities';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';
import { AppError } from '@/domain/errors';

export type OpenCashRegisterInputDTO = {
  barbershopId: string;
  openingAmountCents?: number;
  note?: string | null;
};

export default class OpenCashRegisterUseCase {
  constructor(
    private readonly cashRegisterRepository: ICashRegisterRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: OpenCashRegisterInputDTO, auditCtx?: AuditContext): Promise<CashRegister> {
    const openedKey = localDateKey(new Date());

    const existing = await this.cashRegisterRepository.findOpenByBarbershop(input.barbershopId);
    if (existing) {
      throw new AppError(
        'Já existe um caixa aberto para esta barbearia',
        'CASH_REGISTER_ALREADY_OPEN',
      );
    }

    const registers = await this.cashRegisterRepository.findByBarbershop(input.barbershopId);
    if (registers.some(register => register.openedKey === openedKey)) {
      throw new AppError(
        'Já existe um caixa para hoje nesta barbearia',
        'CASH_REGISTER_ALREADY_OPEN',
      );
    }

    const register = new CashRegister({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      openedKey,
      openingAmountCents: input.openingAmountCents ?? 0,
      note: input.note ?? null,
    });

    const saved = await this.cashRegisterRepository.save(register);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'CREATE',
      entityType: 'CASH_REGISTER',
      entityId: saved.id,
      after: {
        id: saved.id,
        openedKey: saved.openedKey,
        openingAmountCents: saved.openingAmountCents,
        status: saved.status,
      },
    });

    return saved;
  }
}
