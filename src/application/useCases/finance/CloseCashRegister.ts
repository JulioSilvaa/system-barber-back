import AuditService, { AuditContext } from '@/application/services/AuditService';
import { CashRegister } from '@/domain/entities';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';
import { AppError } from '@/domain/errors';

export type CloseCashRegisterInputDTO = {
  barbershopId: string;
  registerId?: string;
  closingAmountCents: number;
  note?: string | null;
};

export default class CloseCashRegisterUseCase {
  constructor(
    private readonly cashRegisterRepository: ICashRegisterRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: CloseCashRegisterInputDTO, auditCtx?: AuditContext): Promise<CashRegister> {
    const register = input.registerId
      ? await this.cashRegisterRepository.findById(input.registerId, input.barbershopId)
      : await this.cashRegisterRepository.findOpenByBarbershop(input.barbershopId);

    if (!register) {
      throw new Error('Não há caixa aberto para esta barbearia');
    }

    if (!register.isOpen()) {
      throw new AppError('Este caixa já foi fechado', 'CASH_REGISTER_ALREADY_CLOSED');
    }

    const movements = await this.cashRegisterRepository.listMovements(register.id);
    const expectedAmountCents = register.calculateExpectedAmount(movements);

    register.close({ closingAmountCents: input.closingAmountCents, note: input.note ?? null });
    register.setFinancialSummary(expectedAmountCents);

    const saved = await this.cashRegisterRepository.save(register);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'CLOSE',
      entityType: 'CASH_REGISTER',
      entityId: saved.id,
      before: { status: 'OPEN' },
      after: {
        id: saved.id,
        status: saved.status,
        closingAmountCents: saved.closingAmountCents,
        expectedAmountCents: saved.expectedAmountCents,
        differenceCents: saved.differenceCents,
      },
    });

    return saved;
  }
}
