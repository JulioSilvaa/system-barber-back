import { FinanceEntry } from '@/domain/entities';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';

export default class FinanceEntryRepositoryMemory implements IFinanceEntryRepository {
  private entries: FinanceEntry[] = [];

  async save(entry: FinanceEntry): Promise<FinanceEntry> {
    const existingIndex = this.entries.findIndex(item => item.id === entry.id);
    if (existingIndex !== -1) {
      this.entries[existingIndex] = entry;
    } else {
      this.entries.push(entry);
    }
    return entry;
  }

  async findByBarbershop(barbershopId: string): Promise<FinanceEntry[]> {
    return this.entries
      .filter(entry => entry.barbershopId === barbershopId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByBarbershopAndDate(barbershopId: string, date: Date): Promise<FinanceEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.entries
      .filter(
        entry =>
          entry.barbershopId === barbershopId &&
          entry.createdAt >= startOfDay &&
          entry.createdAt < endOfDay,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
