export type ServiceProps = {
  id: string;
  barbershopId: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  isActive?: boolean;
};

export class Service {
  public readonly id: string;
  public readonly barbershopId: string;
  public name: string;
  public priceCents: number;
  public durationMinutes: number;
  public isActive: boolean;

  constructor(props: ServiceProps) {
    if (props.priceCents <= 0) {
      throw new Error('price must be greater than zero');
    }

    if (props.durationMinutes <= 0) {
      throw new Error('duration must be greater than zero');
    }

    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.priceCents = props.priceCents;
    this.durationMinutes = props.durationMinutes;
    this.isActive = props.isActive ?? true;
  }

  public updateDetails(details: Partial<Pick<Service, 'name' | 'priceCents' | 'durationMinutes'>>) {
    if (details.name !== undefined) {
      if (!details.name.trim()) {
        throw new Error('Nome do serviço é obrigatório');
      }
      this.name = details.name.trim();
    }
    if (details.priceCents !== undefined) {
      this.priceCents = details.priceCents;
    }
    if (details.durationMinutes !== undefined) {
      this.durationMinutes = details.durationMinutes;
    }
    this.validate();
  }

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  private validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('Nome do serviço é obrigatório');
    }
    if (this.priceCents <= 0) {
      throw new Error('price must be greater than zero');
    }
    if (this.durationMinutes <= 0) {
      throw new Error('duration must be greater than zero');
    }
  }
}
