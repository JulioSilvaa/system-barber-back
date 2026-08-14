import { FinanceEntry } from '@/domain/entities';
import { FinanceEntryKind } from '@/domain/entities/FinanceEntry';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';
import type { FinanceEntry as PrismaFinanceEntry, PrismaClient } from '@/generated/prisma/client';

function toEntity(row: PrismaFinanceEntry): FinanceEntry {
  return new FinanceEntry({
    id: row.id,
    barbershopId: row.barbershopId,
    kind: row.kind as FinanceEntryKind,
    category: row.category,
    amountCents: row.amountCents,
    description: row.description,
    appointmentId: row.appointmentId,
    createdAt: row.createdAt,
  });
}

export default class FinanceEntryRepositoryPrisma implements IFinanceEntryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(entry: FinanceEntry): Promise<FinanceEntry> {
    await this.prisma.financeEntry.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        barbershopId: entry.barbershopId,
        kind: entry.kind,
        category: entry.category,
        amountCents: entry.amountCents,
        description: entry.description,
        appointmentId: entry.appointmentId,
      },
      update: {
        kind: entry.kind,
        category: entry.category,
        amountCents: entry.amountCents,
        description: entry.description,
        appointmentId: entry.appointmentId,
      },
    });
    return entry;
  }

  async findByBarbershop(barbershopId: string): Promise<FinanceEntry[]> {
    const rows = await this.prisma.financeEntry.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async findByBarbershopAndDate(barbershopId: string, date: Date): Promise<FinanceEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await this.prisma.financeEntry.findMany({
      where: {
        barbershopId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async findById(id: string, barbershopId: string): Promise<FinanceEntry | null> {
    const row = await this.prisma.financeEntry.findFirst({
      where: { id, barbershopId },
    });
    return row ? toEntity(row) : null;
  }
}
