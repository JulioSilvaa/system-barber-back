import { CashRegister } from '@/domain/entities';
import { CashRegisterMovement } from '@/domain/entities';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';

export type CashRegisterOverviewDTO = {
  open: {
    register: CashRegister;
    movements: CashRegisterMovement[];
    totals: {
      expectedAmountCents: number;
      entriesCents: number;
      exitsCents: number;
    };
  } | null;
  history: CashRegister[];
};

export default class GetCashRegisterOverviewUseCase {
  constructor(private readonly cashRegisterRepository: ICashRegisterRepository) {}

  async execute(barbershopId: string): Promise<CashRegisterOverviewDTO> {
    const registers = await this.cashRegisterRepository.findByBarbershop(barbershopId);
    const openRegister = registers.find(register => register.isOpen());

    if (!openRegister) {
      return { open: null, history: registers };
    }

    const movements = await this.cashRegisterRepository.listMovements(openRegister.id);
    const expectedAmountCents = openRegister.calculateExpectedAmount(movements);
    const entriesCents = movements
      .filter(movement => movement.kind === 'ENTRY')
      .reduce((sum, movement) => sum + movement.amountCents, 0);
    const exitsCents = movements
      .filter(movement => movement.kind === 'EXIT')
      .reduce((sum, movement) => sum + movement.amountCents, 0);

    return {
      open: {
        register: openRegister,
        movements,
        totals: { expectedAmountCents, entriesCents, exitsCents },
      },
      history: registers,
    };
  }
}
