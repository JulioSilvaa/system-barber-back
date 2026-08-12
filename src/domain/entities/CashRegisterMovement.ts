export type CashRegisterMovementKind = 'ENTRY' | 'EXIT';

export type CashRegisterMovementCategory = 'PIX' | 'CARD' | 'CASH' | 'EXPENSE' | 'OTHER';

export type CashRegisterMovementProps = {
  id: string;
  cashRegisterId: string;
  barbershopId: string;
  kind: CashRegisterMovementKind;
  category: CashRegisterMovementCategory;
  amountCents: number;
  description?: string | null;
  appointmentId?: string | null;
  createdAt?: Date;
};

export default class CashRegisterMovement {
  public readonly id: string;
  public readonly cashRegisterId: string;
  public readonly barbershopId: string;
  public readonly kind: CashRegisterMovementKind;
  public readonly category: CashRegisterMovementCategory;
  public readonly amountCents: number;
  public readonly description: string | null;
  public readonly appointmentId: string | null;
  public readonly createdAt: Date;

  constructor(props: CashRegisterMovementProps) {
    this.id = props.id;
    this.cashRegisterId = props.cashRegisterId;
    this.barbershopId = props.barbershopId;
    this.kind = props.kind;
    this.category = props.category;
    this.amountCents = props.amountCents;
    this.description = props.description ?? null;
    this.appointmentId = props.appointmentId ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.validate();
  }

  public get signedAmountCents(): number {
    return this.kind === 'ENTRY' ? this.amountCents : -this.amountCents;
  }

  private validate(): void {
    if (!this.cashRegisterId || this.cashRegisterId.trim() === '') {
      throw new Error('Caixa é obrigatório');
    }

    if (!this.barbershopId || this.barbershopId.trim() === '') {
      throw new Error('ID da barbearia é obrigatório');
    }

    const validKinds: CashRegisterMovementKind[] = ['ENTRY', 'EXIT'];
    if (!validKinds.includes(this.kind)) {
      throw new Error('Tipo de movimentação inválido');
    }

    const validCategories: CashRegisterMovementCategory[] = [
      'PIX',
      'CARD',
      'CASH',
      'EXPENSE',
      'OTHER',
    ];
    if (!validCategories.includes(this.category)) {
      throw new Error('Categoria inválida');
    }

    if (!Number.isInteger(this.amountCents) || this.amountCents <= 0) {
      throw new Error('Valor da movimentação deve ser maior que zero');
    }
  }
}
