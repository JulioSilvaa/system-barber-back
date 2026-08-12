import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import OpenCashRegisterUseCase from '@/application/useCases/finance/OpenCashRegister';
import CloseCashRegisterUseCase from '@/application/useCases/finance/CloseCashRegister';
import AddCashRegisterMovementUseCase from '@/application/useCases/finance/AddCashRegisterMovement';
import GetCashRegisterOverviewUseCase from '@/application/useCases/finance/GetCashRegisterOverview';
import CashRegister from '@/domain/entities/CashRegister';
import CashRegisterMovement from '@/domain/entities/CashRegisterMovement';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import { emitDataChanged } from '@/infra/websocket/socketServer';
import CashRegisterRepositoryMemory from '@/infra/repositories/inMemory/cashRegister/cashRegisterRepositoryMemory';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';

export default class CashRegisterController {
  private readonly openCashRegisterUseCase: OpenCashRegisterUseCase;
  private readonly closeCashRegisterUseCase: CloseCashRegisterUseCase;
  private readonly addMovementUseCase: AddCashRegisterMovementUseCase;
  private readonly getOverviewUseCase: GetCashRegisterOverviewUseCase;

  constructor(
    cashRegisterRepository: ICashRegisterRepository = new CashRegisterRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.openCashRegisterUseCase = new OpenCashRegisterUseCase(
      cashRegisterRepository,
      auditService,
    );
    this.closeCashRegisterUseCase = new CloseCashRegisterUseCase(
      cashRegisterRepository,
      auditService,
    );
    this.addMovementUseCase = new AddCashRegisterMovementUseCase(
      cashRegisterRepository,
      auditService,
    );
    this.getOverviewUseCase = new GetCashRegisterOverviewUseCase(cashRegisterRepository);
  }

  open = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = this.barbershopId(req);
      const body = req.body ?? {};
      const register = await this.openCashRegisterUseCase.execute(
        {
          barbershopId,
          openingAmountCents: body.openingAmountCents,
          note: body.note,
        },
        buildAuditContext(req),
      );

      emitDataChanged(barbershopId);
      return res.status(201).json(toRegisterOutput(register));
    } catch (error) {
      next(error);
    }
  };

  close = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = this.barbershopId(req);
      const body = req.body ?? {};
      const register = await this.closeCashRegisterUseCase.execute(
        {
          barbershopId,
          registerId: body.registerId,
          closingAmountCents: body.closingAmountCents,
          note: body.note,
        },
        buildAuditContext(req),
      );

      emitDataChanged(barbershopId);
      return res.status(200).json(toRegisterOutput(register));
    } catch (error) {
      next(error);
    }
  };

  addMovement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = this.barbershopId(req);
      const body = req.body ?? {};
      const movement = await this.addMovementUseCase.execute(
        {
          barbershopId,
          cashRegisterId: body.cashRegisterId,
          kind: body.kind,
          category: body.category,
          amountCents: body.amountCents,
          description: body.description,
        },
        buildAuditContext(req),
      );

      emitDataChanged(barbershopId);
      return res.status(201).json(toMovementOutput(movement));
    } catch (error) {
      next(error);
    }
  };

  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = this.barbershopId(req);
      const overview = await this.getOverviewUseCase.execute(barbershopId);
      const open = overview.open
        ? {
            ...toRegisterOutput(overview.open.register),
            movements: overview.open.movements.map(toMovementOutput),
            totals: overview.open.totals,
          }
        : null;

      return res.status(200).json({ open, history: overview.history.map(toRegisterOutput) });
    } catch (error) {
      next(error);
    }
  };

  private barbershopId(req: Request): string {
    const raw = req.params.barbershopId;
    return Array.isArray(raw) ? raw[0] : raw;
  }
}

function toRegisterOutput(register: CashRegister) {
  return {
    id: register.id,
    barbershopId: register.barbershopId,
    openedKey: register.openedKey,
    openedAt: register.openedAt,
    openingAmountCents: register.openingAmountCents,
    closedAt: register.closedAt,
    closingAmountCents: register.closingAmountCents,
    expectedAmountCents: register.expectedAmountCents,
    differenceCents: register.differenceCents,
    note: register.note,
    status: register.status,
  };
}

function toMovementOutput(movement: CashRegisterMovement) {
  return {
    id: movement.id,
    cashRegisterId: movement.cashRegisterId,
    kind: movement.kind,
    category: movement.category,
    amountCents: movement.amountCents,
    description: movement.description,
    appointmentId: movement.appointmentId,
    createdAt: movement.createdAt,
  };
}
