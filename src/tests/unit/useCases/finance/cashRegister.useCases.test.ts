import { beforeEach, describe, expect, it } from 'vitest';
import OpenCashRegisterUseCase from '@/application/useCases/finance/OpenCashRegister';
import CloseCashRegisterUseCase from '@/application/useCases/finance/CloseCashRegister';
import AddCashRegisterMovementUseCase from '@/application/useCases/finance/AddCashRegisterMovement';
import GetCashRegisterOverviewUseCase from '@/application/useCases/finance/GetCashRegisterOverview';
import CashRegisterRepositoryMemory from '@/infra/repositories/inMemory/cashRegister/cashRegisterRepositoryMemory';

describe('Cash Register Use Cases', () => {
  let cashRegisterRepository: CashRegisterRepositoryMemory;

  const BARBERSHOP_ID = 'barbershop-1';

  beforeEach(() => {
    cashRegisterRepository = new CashRegisterRepositoryMemory();
  });

  describe('OpenCashRegisterUseCase', () => {
    it('abre um caixa com fundo de caixa', async () => {
      const useCase = new OpenCashRegisterUseCase(cashRegisterRepository);
      const register = await useCase.execute({
        barbershopId: BARBERSHOP_ID,
        openingAmountCents: 1000,
      });

      expect(register).toEqual(
        expect.objectContaining({
          status: 'OPEN',
          openingAmountCents: 1000,
          barbershopId: BARBERSHOP_ID,
        }),
      );
      expect(register.openedKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('lança CASH_REGISTER_ALREADY_OPEN quando já existe caixa aberto', async () => {
      const useCase = new OpenCashRegisterUseCase(cashRegisterRepository);
      await useCase.execute({ barbershopId: BARBERSHOP_ID });

      await expect(useCase.execute({ barbershopId: BARBERSHOP_ID })).rejects.toMatchObject({
        code: 'CASH_REGISTER_ALREADY_OPEN',
      });
    });
  });

  describe('AddCashRegisterMovementUseCase', () => {
    it('registra entrada e saída no caixa aberto', async () => {
      await new OpenCashRegisterUseCase(cashRegisterRepository).execute({
        barbershopId: BARBERSHOP_ID,
      });
      const useCase = new AddCashRegisterMovementUseCase(cashRegisterRepository);

      const entry = await useCase.execute({
        barbershopId: BARBERSHOP_ID,
        kind: 'ENTRY',
        category: 'PIX',
        amountCents: 4000,
      });
      const exit = await useCase.execute({
        barbershopId: BARBERSHOP_ID,
        kind: 'EXIT',
        category: 'EXPENSE',
        amountCents: 500,
        description: 'Água',
      });

      expect(entry).toMatchObject({ kind: 'ENTRY', category: 'PIX', amountCents: 4000 });
      expect(exit).toMatchObject({ kind: 'EXIT', category: 'EXPENSE', amountCents: 500 });
    });

    it('lança erro sem caixa aberto', async () => {
      const useCase = new AddCashRegisterMovementUseCase(cashRegisterRepository);

      await expect(
        useCase.execute({
          barbershopId: BARBERSHOP_ID,
          kind: 'ENTRY',
          category: 'PIX',
          amountCents: 1000,
        }),
      ).rejects.toThrow('Não há caixa aberto para esta barbearia');
    });
  });

  describe('CloseCashRegisterUseCase', () => {
    it('fecha calculando valor esperado e diferença', async () => {
      const open = await new OpenCashRegisterUseCase(cashRegisterRepository).execute({
        barbershopId: BARBERSHOP_ID,
        openingAmountCents: 1000,
      });
      await new AddCashRegisterMovementUseCase(cashRegisterRepository).execute({
        barbershopId: BARBERSHOP_ID,
        kind: 'ENTRY',
        category: 'CASH',
        amountCents: 5000,
      });
      await new AddCashRegisterMovementUseCase(cashRegisterRepository).execute({
        barbershopId: BARBERSHOP_ID,
        kind: 'EXIT',
        category: 'EXPENSE',
        amountCents: 2000,
      });

      const close = new CloseCashRegisterUseCase(cashRegisterRepository);
      const closed = await close.execute({
        barbershopId: BARBERSHOP_ID,
        registerId: open.id,
        closingAmountCents: 3900,
      });

      expect(closed).toMatchObject({
        status: 'CLOSED',
        expectedAmountCents: 4000,
        closingAmountCents: 3900,
        differenceCents: -100,
      });
    });

    it('lança CASH_REGISTER_ALREADY_CLOSED ao fechar duas vezes', async () => {
      const open = await new OpenCashRegisterUseCase(cashRegisterRepository).execute({
        barbershopId: BARBERSHOP_ID,
      });
      const close = new CloseCashRegisterUseCase(cashRegisterRepository);
      await close.execute({
        barbershopId: BARBERSHOP_ID,
        registerId: open.id,
        closingAmountCents: 0,
      });

      await expect(
        close.execute({ barbershopId: BARBERSHOP_ID, registerId: open.id, closingAmountCents: 0 }),
      ).rejects.toMatchObject({ code: 'CASH_REGISTER_ALREADY_CLOSED' });
    });
  });

  describe('GetCashRegisterOverviewUseCase', () => {
    it('retorna caixa aberto com totais', async () => {
      await new OpenCashRegisterUseCase(cashRegisterRepository).execute({
        barbershopId: BARBERSHOP_ID,
        openingAmountCents: 1000,
      });
      await new AddCashRegisterMovementUseCase(cashRegisterRepository).execute({
        barbershopId: BARBERSHOP_ID,
        kind: 'ENTRY',
        category: 'CARD',
        amountCents: 6000,
      });

      const overview = await new GetCashRegisterOverviewUseCase(cashRegisterRepository).execute(
        BARBERSHOP_ID,
      );

      expect(overview.open).not.toBeNull();
      expect(overview.open?.totals).toEqual({
        expectedAmountCents: 7000,
        entriesCents: 6000,
        exitsCents: 0,
      });
      expect(overview.open?.movements).toHaveLength(1);
    });

    it('retorna open null quando não há caixa aberto', async () => {
      const overview = await new GetCashRegisterOverviewUseCase(cashRegisterRepository).execute(
        BARBERSHOP_ID,
      );

      expect(overview.open).toBeNull();
    });
  });
});
