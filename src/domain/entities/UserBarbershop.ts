import { ValidationError } from '@/domain/errors';
export type MembershipStatus = 'ACTIVE' | 'INACTIVE';

export type LocalBarbershopRole = 'OWNER' | 'BARBER';

export type UserBarbershopProps = {
  id: string;
  userId: string;
  barbershopId: string;
  status?: MembershipStatus;
  localRole?: LocalBarbershopRole;
  commissionRate?: number | null;
};

export default class UserBarbershop {
  public readonly id: string;
  public readonly userId: string;
  public readonly barbershopId: string;
  public status: MembershipStatus;
  public readonly localRole: LocalBarbershopRole;
  public commissionRate: number | null;

  constructor(props: UserBarbershopProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.barbershopId = props.barbershopId;
    this.status = props.status ?? 'ACTIVE';
    this.localRole = props.localRole ?? 'BARBER';
    this.commissionRate = props.commissionRate ?? null;
    this.validate();
  }

  // ================= MÉTODOS DE ESTADO =================
  public activate(): void {
    this.status = 'ACTIVE';
  }

  public deactivate(): void {
    this.status = 'INACTIVE';
  }

  public isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  // ================= MÉTODOS DE CONVENIÊNCIA =================
  public isOwner(): boolean {
    return this.localRole === 'OWNER';
  }

  public isBarber(): boolean {
    return this.localRole === 'BARBER';
  }

  public setCommissionRate(rate: number | null): void {
    if (rate !== null) {
      if (!Number.isInteger(rate) || rate < 0 || rate > 100) {
        throw new ValidationError('Percentual de comissão deve estar entre 0 e 100');
      }
    }

    this.commissionRate = rate;
  }

  // ================= VALIDAÇÕES =================
  private validate(): void {
    if (!this.userId || this.userId.trim() === '') {
      throw new ValidationError('ID do usuário é obrigatório');
    }

    if (!this.barbershopId || this.barbershopId.trim() === '') {
      throw new ValidationError('ID da barbearia é obrigatório');
    }

    const validStatuses: MembershipStatus[] = ['ACTIVE', 'INACTIVE'];
    if (!this.status || !validStatuses.includes(this.status)) {
      throw new ValidationError('Status de membro inválido');
    }

    const validRoles: LocalBarbershopRole[] = ['OWNER', 'BARBER'];
    if (!this.localRole || !validRoles.includes(this.localRole)) {
      throw new ValidationError('Papel local inválido');
    }

    if (
      this.commissionRate !== null &&
      (!Number.isInteger(this.commissionRate) ||
        this.commissionRate < 0 ||
        this.commissionRate > 100)
    ) {
      throw new ValidationError('Percentual de comissão deve estar entre 0 e 100');
    }
  }
}
