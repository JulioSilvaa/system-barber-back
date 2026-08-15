import { ValidationError } from '@/domain/errors';
export type FinanceEntryKind = 'ENTRY' | 'EXIT';

export type FinanceEntryProps = {
  id: string;
  barbershopId: string;
  kind: FinanceEntryKind;
  category?: string | null;
  amountCents: number;
  description?: string | null;
  appointmentId?: string | null;
  createdAt?: Date;
};

export default class FinanceEntry {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly kind: FinanceEntryKind;
  public readonly category: string | null;
  public readonly amountCents: number;
  public readonly description: string | null;
  public readonly appointmentId: string | null;
  public readonly createdAt: Date;

  constructor(props: FinanceEntryProps) {
    if (!['ENTRY', 'EXIT'].includes(props.kind)) {
      throw new ValidationError('Tipo de lançamento inválido');
    }

    if (!Number.isInteger(props.amountCents) || props.amountCents <= 0) {
      throw new ValidationError('Valor do lançamento é obrigatório');
    }

    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.kind = props.kind;
    this.category = props.category ?? null;
    this.amountCents = props.amountCents;
    this.description = props.description?.trim() || null;
    this.appointmentId = props.appointmentId ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }
}
