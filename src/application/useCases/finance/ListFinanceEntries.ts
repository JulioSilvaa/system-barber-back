import { FinanceEntry } from '@/domain/entities';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';

export default class ListFinanceEntriesUseCase {
  constructor(private readonly financeEntryRepository: IFinanceEntryRepository) {}

  async execute(barbershopId: string, date?: Date | null): Promise<FinanceEntry[]> {
    if (date) {
      return this.financeEntryRepository.findByBarbershopAndDate(barbershopId, date);
    }
    return this.financeEntryRepository.findByBarbershop(barbershopId);
  }
}
