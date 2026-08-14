export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type AppointmentPaymentMethod = 'PIX' | 'CARD' | 'CASH';

export type AppointmentProps = {
  id: string;
  barbershopId: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  status?: AppointmentStatus;
  pricePaidCents?: number | null;
  paymentMethod?: AppointmentPaymentMethod | null;
  note?: string | null;
};

export class Appointment {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly barberId: string;
  public readonly serviceId: string;
  public readonly customerId: string;
  public readonly startDate: Date;
  public readonly endDate: Date;
  public status: AppointmentStatus;
  public pricePaidCents: number | null;
  public paymentMethod: AppointmentPaymentMethod | null;
  public note: string | null;

  constructor(props: AppointmentProps) {
    if (props.endDate <= props.startDate) {
      throw new Error('end date must be greater than start date');
    }

    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.barberId = props.barberId;
    this.serviceId = props.serviceId;
    this.customerId = props.customerId;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.status = props.status ?? 'SCHEDULED';
    this.pricePaidCents = props.pricePaidCents ?? null;
    this.paymentMethod = props.paymentMethod ?? null;
    this.note = props.note ?? null;
  }

  public isOverlappingWith(other: Appointment): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate;
  }

  public complete(payment: {
    pricePaidCents: number;
    paymentMethod: AppointmentPaymentMethod;
    note?: string | null;
  }): void {
    if (this.status === 'CANCELLED') {
      throw new Error('appointment canceled');
    }

    if (this.status === 'COMPLETED') {
      throw new Error('appointment already completed');
    }

    if (!Number.isInteger(payment.pricePaidCents) || payment.pricePaidCents <= 0) {
      throw new Error('Valor da cobrança é obrigatório');
    }

    if (!['PIX', 'CARD', 'CASH'].includes(payment.paymentMethod)) {
      throw new Error('Forma de pagamento inválida');
    }

    this.pricePaidCents = payment.pricePaidCents;
    this.paymentMethod = payment.paymentMethod;
    this.note = payment.note?.trim() || null;
    this.status = 'COMPLETED';
  }

  public cancel(): void {
    if (this.status === 'COMPLETED') {
      throw new Error('appointment already completed');
    }

    this.status = 'CANCELLED';
  }
}
