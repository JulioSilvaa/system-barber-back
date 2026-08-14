export type WorkingHoursProps = {
  id: string;
  barbershopId: string;
  barberId?: string | null;
  dayOfWeek: number;
  isOpen?: boolean;
  openTime?: string | null;
  closeTime?: string | null;
};

const VALID_DAYS = [0, 1, 2, 3, 4, 5, 6];

export class WorkingHours {
  public readonly id: string;
  public readonly barbershopId: string;
  public readonly barberId: string | null;
  public readonly dayOfWeek: number;
  public readonly isOpen: boolean;
  public readonly openTime: string | null;
  public readonly closeTime: string | null;

  constructor(props: WorkingHoursProps) {
    if (!VALID_DAYS.includes(props.dayOfWeek)) {
      throw new Error('dayOfWeek deve ser um valor entre 0 e 6');
    }

    if (props.isOpen && (!props.openTime || !props.closeTime)) {
      throw new Error('openTime e closeTime são obrigatórios quando aberto');
    }

    if (props.openTime && props.closeTime && props.openTime >= props.closeTime) {
      throw new Error('openTime deve ser anterior a closeTime');
    }

    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.barberId = props.barberId ?? null;
    this.dayOfWeek = props.dayOfWeek;
    this.isOpen = props.isOpen ?? true;
    this.openTime = props.openTime ?? null;
    this.closeTime = props.closeTime ?? null;
  }
}
