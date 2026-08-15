import { FinanceEntry } from '@/domain/entities';

export default interface IFinanceEntryRepository {
  save(entry: FinanceEntry): Promise<FinanceEntry>;
  findByBarbershop(barbershopId: string): Promise<FinanceEntry[]>;
  findByBarbershopAndDate(barbershopId: string, date: Date): Promise<FinanceEntry[]>;
}
