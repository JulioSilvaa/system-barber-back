import { CashRegisterMovement } from '@/domain/entities';
import { CashRegister } from '@/domain/entities';
import { CashRegisterMovementCategory } from '@/domain/entities/CashRegisterMovement';
import { CashRegisterMovementKind } from '@/domain/entities/CashRegisterMovement';
import { CashRegisterStatus } from '@/domain/entities/CashRegister';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';
import type {
  Commission as PrismaCommission,
  CashRegister as PrismaCashRegister,
  CashRegisterMovement as PrismaCashRegisterMovement,
  PrismaClient,
} from '@/generated/prisma/client';
import Commission from '@/domain/entities/Commission';

function toCommissionEntity(row: PrismaCommission): Commission {
  return new Commission({
    id: row.id,
    barbershopId: row.barbershopId,
    barberId: row.barberId,
    appointmentId: row.appointmentId,
    serviceValueCents: row.serviceValueCents,
    commissionCents: row.commissionCents,
    rate: row.rate,
    isPaid: row.isPaid,
    createdAt: row.createdAt,
  });
}

function toCashRegisterEntity(row: PrismaCashRegister): CashRegister {
  return new CashRegister({
    id: row.id,
    barbershopId: row.barbershopId,
    openedKey: row.openedKey,
    openedAt: row.openedAt,
    openingAmountCents: row.openingAmountCents,
    closedAt: row.closedAt,
    closingAmountCents: row.closingAmountCents,
    expectedAmountCents: row.expectedAmountCents,
    differenceCents: row.differenceCents,
    note: row.note,
    status: row.status as CashRegisterStatus,
    createdAt: row.createdAt,
  });
}

function toMovementEntity(row: PrismaCashRegisterMovement): CashRegisterMovement {
  return new CashRegisterMovement({
    id: row.id,
    cashRegisterId: row.cashRegisterId,
    barbershopId: row.barbershopId,
    kind: row.kind as CashRegisterMovementKind,
    category: row.category as CashRegisterMovementCategory,
    amountCents: row.amountCents,
    description: row.description,
    appointmentId: row.appointmentId,
    createdAt: row.createdAt,
  });
}

export class CommissionRepositoryPrisma implements ICommissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(commission: Commission): Promise<Commission> {
    await this.prisma.commission.upsert({
      where: { id: commission.id },
      create: {
        id: commission.id,
        barbershopId: commission.barbershopId,
        barberId: commission.barberId,
        appointmentId: commission.appointmentId,
        serviceValueCents: commission.serviceValueCents,
        commissionCents: commission.commissionCents,
        rate: commission.rate,
        isPaid: commission.isPaid,
      },
      update: {
        serviceValueCents: commission.serviceValueCents,
        commissionCents: commission.commissionCents,
        rate: commission.rate,
        isPaid: commission.isPaid,
      },
    });
    return commission;
  }

  async findByBarbershop(barbershopId: string): Promise<Commission[]> {
    const rows = await this.prisma.commission.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCommissionEntity);
  }

  async findByBarber(barberId: string, barbershopId: string): Promise<Commission[]> {
    const rows = await this.prisma.commission.findMany({
      where: { barberId, barbershopId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCommissionEntity);
  }

  async findByAppointment(appointmentId: string): Promise<Commission | null> {
    const row = await this.prisma.commission.findFirst({
      where: { appointmentId },
    });
    return row ? toCommissionEntity(row) : null;
  }
}

export class CashRegisterRepositoryPrisma implements ICashRegisterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(register: CashRegister): Promise<CashRegister> {
    await this.prisma.cashRegister.upsert({
      where: { id: register.id },
      create: {
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
      },
      update: {
        closedAt: register.closedAt,
        closingAmountCents: register.closingAmountCents,
        expectedAmountCents: register.expectedAmountCents,
        differenceCents: register.differenceCents,
        note: register.note,
        status: register.status,
      },
    });
    return register;
  }

  async findOpenByBarbershop(barbershopId: string): Promise<CashRegister | null> {
    const row = await this.prisma.cashRegister.findFirst({
      where: { barbershopId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    return row ? toCashRegisterEntity(row) : null;
  }

  async findById(id: string, barbershopId: string): Promise<CashRegister | null> {
    const row = await this.prisma.cashRegister.findFirst({
      where: { id, barbershopId },
    });
    return row ? toCashRegisterEntity(row) : null;
  }

  async findByBarbershop(barbershopId: string): Promise<CashRegister[]> {
    const rows = await this.prisma.cashRegister.findMany({
      where: { barbershopId },
      orderBy: { openedAt: 'desc' },
    });
    return rows.map(toCashRegisterEntity);
  }

  async saveMovement(movement: CashRegisterMovement): Promise<CashRegisterMovement> {
    await this.prisma.cashRegisterMovement.create({
      data: {
        id: movement.id,
        cashRegisterId: movement.cashRegisterId,
        barbershopId: movement.barbershopId,
        kind: movement.kind,
        category: movement.category,
        amountCents: movement.amountCents,
        description: movement.description,
        appointmentId: movement.appointmentId,
      },
    });
    return movement;
  }

  async listMovements(cashRegisterId: string): Promise<CashRegisterMovement[]> {
    const rows = await this.prisma.cashRegisterMovement.findMany({
      where: { cashRegisterId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMovementEntity);
  }
}
