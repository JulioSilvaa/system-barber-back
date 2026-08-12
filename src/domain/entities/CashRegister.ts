import CashRegisterMovement from './CashRegisterMovement';

export type CashRegisterStatus = 'OPEN' | 'CLOSED';

export type CashRegisterProps = {
  id: string;
  barbershopId: string;
  openedKey: string;
  openedAt?: Date;
  openingAmountCents?: number;
  closedAt?: Date | null;
  closingAmountCents?: number | null;
  expectedAmountCents?: number | null;
  differenceCents?: number | null;
  note?: string | null;
  status?: CashRegisterStatus;
  createdAt?: Date;
};

export default class CashRegister {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly openedKey: string;
  public readonly openedAt: Date;
  public readonly openingAmountCents: number;
  public closedAt: Date | null;
  public closingAmountCents: number | null;
  public expectedAmountCents: number | null;
  public differenceCents: number | null;
  public note: string | null;
  public status: CashRegisterStatus;
  public readonly createdAt: Date;

  constructor(props: CashRegisterProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.openedKey = props.openedKey;
    this.openedAt = props.openedAt ?? new Date();
    this.openingAmountCents = props.openingAmountCents ?? 0;
    this.closedAt = props.closedAt ?? null;
    this.closingAmountCents = props.closingAmountCents ?? null;
    this.expectedAmountCents = props.expectedAmountCents ?? null;
    this.differenceCents = props.differenceCents ?? null;
    this.note = props.note ?? null;
    this.status = props.status ?? 'OPEN';
    this.createdAt = props.createdAt ?? new Date();
    this.validate();
  }

  public isOpen(): boolean {
    return this.status === 'OPEN';
  }

  public close(options: { closingAmountCents: number; note?: string | null }): void {
    if (this.status === 'CLOSED') {
      throw new Error('caixa já fechado');
    }

    if (!Number.isInteger(options.closingAmountCents) || options.closingAmountCents < 0) {
      throw new Error('Valor de fechamento inválido');
    }

    this.closedAt = new Date();
    this.closingAmountCents = options.closingAmountCents;
    this.note = options.note ?? this.note;
    this.status = 'CLOSED';
  }

  public calculateExpectedAmount(movements: CashRegisterMovement[]): number {
    return (
      this.openingAmountCents +
      movements.reduce((sum, movement) => sum + movement.signedAmountCents, 0)
    );
  }

  public setFinancialSummary(expectedAmountCents: number): void {
    this.expectedAmountCents = expectedAmountCents;
    if (this.closingAmountCents !== null && expectedAmountCents !== null) {
      this.differenceCents = this.closingAmountCents - expectedAmountCents;
    }
  }

  private validate(): void {
    if (!this.barbershopId || this.barbershopId.trim() === '') {
      throw new Error('ID da barbearia é obrigatório');
    }

    if (!this.openedKey || this.openedKey.trim() === '') {
      throw new Error('Chave de abertura do caixa é obrigatória');
    }

    if (!Number.isInteger(this.openingAmountCents) || this.openingAmountCents < 0) {
      throw new Error('Fundo de caixa inválido');
    }

    const validStatuses: CashRegisterStatus[] = ['OPEN', 'CLOSED'];
    if (!validStatuses.includes(this.status)) {
      throw new Error('Status de caixa inválido');
    }
  }
}
