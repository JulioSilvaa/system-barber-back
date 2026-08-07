export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type AppointmentProps = {
  id: string;
  barbershopId: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  status?: AppointmentStatus;
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
  }

  public isOverlappingWith(other: Appointment): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate;
  }

  public complete(): void {
    if (this.status === 'CANCELLED') {
      throw new Error('appointment canceled');
    }

    this.status = 'COMPLETED';
  }

  public cancel(): void {
    if (this.status === 'COMPLETED') {
      throw new Error('appointment already completed');
    }

    this.status = 'CANCELLED';
  }
}
