import { ValidationError } from '@/domain/errors';
export type EvaluationProps = {
  id: string;
  barbershopId: string;
  appointmentId: string;
  barberId: string;
  rating: number;
  comment?: string | null;
  createdAt?: Date;
};

export default class Evaluation {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly appointmentId: string;
  public readonly barberId: string;
  public readonly rating: number;
  public readonly comment: string | null;
  public readonly createdAt: Date;

  constructor(props: EvaluationProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.appointmentId = props.appointmentId;
    this.barberId = props.barberId;
    this.rating = props.rating;
    this.comment = props.comment ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.validate();
  }

  private validate(): void {
    if (!this.barbershopId || this.barbershopId.trim() === '') {
      throw new ValidationError('ID da barbearia é obrigatório');
    }

    if (!this.appointmentId || this.appointmentId.trim() === '') {
      throw new ValidationError('ID do agendamento é obrigatório');
    }

    if (!this.barberId || this.barberId.trim() === '') {
      throw new ValidationError('ID do barbeiro é obrigatório');
    }

    if (!Number.isInteger(this.rating) || this.rating < 1 || this.rating > 5) {
      throw new ValidationError('A avaliação deve ser uma nota entre 1 e 5');
    }
  }
}
