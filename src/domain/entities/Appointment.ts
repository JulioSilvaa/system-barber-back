import { ValidationError } from '@/domain/errors';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type AppointmentPaymentMethod = 'PIX' | 'CASH' | 'DEBIT' | 'CREDIT';

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
  reminderSent?: boolean;
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
  public reminderSent: boolean;

  constructor(props: AppointmentProps) {
    if (props.endDate <= props.startDate) {
      throw new ValidationError('end date must be greater than start date');
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
    this.reminderSent = props.reminderSent ?? false;
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
      throw new ValidationError('appointment canceled');
    }

    if (this.status === 'COMPLETED') {
      throw new ValidationError('appointment already completed');
    }

    if (!Number.isInteger(payment.pricePaidCents) || payment.pricePaidCents <= 0) {
      throw new ValidationError('Valor da cobrança é obrigatório');
    }

    if (!['PIX', 'CASH', 'DEBIT', 'CREDIT'].includes(payment.paymentMethod)) {
      throw new ValidationError('Forma de pagamento inválida');
    }

    this.pricePaidCents = payment.pricePaidCents;
    this.paymentMethod = payment.paymentMethod;
    this.note = payment.note?.trim() || null;
    this.status = 'COMPLETED';
  }

  public cancel(): void {
    if (this.status === 'COMPLETED') {
      throw new ValidationError('appointment already completed');
    }

    this.status = 'CANCELLED';
  }

  public markReminderSent(): void {
    this.reminderSent = true;
  }
}
