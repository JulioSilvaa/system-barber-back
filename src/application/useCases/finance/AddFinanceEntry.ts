import { randomUUID } from 'node:crypto';

import AuditService, { AuditContext } from '@/application/services/AuditService';
import { FinanceEntry } from '@/domain/entities';
import { FinanceEntryKind } from '@/domain/entities/FinanceEntry';
import IFinanceEntryRepository from '@/domain/repository/FinanceEntryRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export type AddFinanceEntryInputDTO = {
  barbershopId: string;
  kind: FinanceEntryKind;
  amountCents: number;
  category?: string | null;
  description?: string | null;
};

export default class AddFinanceEntryUseCase {
  constructor(
    private readonly financeEntryRepository: IFinanceEntryRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: AddFinanceEntryInputDTO, auditCtx?: AuditContext): Promise<FinanceEntry> {
    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    const entry = new FinanceEntry({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      kind: input.kind,
      amountCents: input.amountCents,
      category: input.category,
      description: input.description,
    });

    const saved = await this.financeEntryRepository.save(entry);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'CREATE',
      entityType: 'FINANCE_ENTRY',
      entityId: saved.id,
      after: {
        id: saved.id,
        kind: saved.kind,
        amountCents: saved.amountCents,
        category: saved.category,
        description: saved.description,
      },
    });

    return saved;
  }
}
