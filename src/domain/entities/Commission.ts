export type CommissionProps = {
  id: string;
  barbershopId: string;
  barberId: string;
  appointmentId: string | null;
  serviceValueCents: number;
  commissionCents: number;
  rate: number;
  isPaid?: boolean;
  createdAt?: Date;
};

export default class Commission {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly barberId: string;
  public readonly appointmentId: string | null;
  public readonly serviceValueCents: number;
  public readonly commissionCents: number;
  public readonly rate: number;
  public isPaid: boolean;
  public readonly createdAt: Date;

  constructor(props: CommissionProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.barberId = props.barberId;
    this.appointmentId = props.appointmentId ?? null;
    this.serviceValueCents = props.serviceValueCents;
    this.commissionCents = props.commissionCents;
    this.rate = props.rate;
    this.isPaid = props.isPaid ?? false;
    this.createdAt = props.createdAt ?? new Date();
    this.validate();
  }

  public markPaid(): void {
    this.isPaid = true;
  }

  private validate(): void {
    if (!this.barbershopId || this.barbershopId.trim() === '') {
      throw new Error('ID da barbearia é obrigatório');
    }

    if (!this.barberId || this.barberId.trim() === '') {
      throw new Error('ID do barbeiro é obrigatório');
    }

    if (!Number.isInteger(this.serviceValueCents) || this.serviceValueCents < 0) {
      throw new Error('Valor do serviço inválido');
    }

    if (!Number.isInteger(this.commissionCents) || this.commissionCents < 0) {
      throw new Error('Valor da comissão inválido');
    }

    if (!Number.isInteger(this.rate) || this.rate < 0 || this.rate > 100) {
      throw new Error('Percentual de comissão deve estar entre 0 e 100');
    }
  }
}
