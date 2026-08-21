import { Commission } from '@/domain/entities';
import ICommissionRepository from '@/domain/repository/CommissionRepository';

export default class CommissionRepositoryMemory implements ICommissionRepository {
  private commissions: Commission[] = [];

  async save(commission: Commission): Promise<Commission> {
    const existingIndex = this.commissions.findIndex(item => item.id === commission.id);
    if (existingIndex !== -1) {
      this.commissions[existingIndex] = commission;
    } else {
      this.commissions.push(commission);
    }
    return commission;
  }

  async findByBarbershop(barbershopId: string): Promise<Commission[]> {
    return this.commissions
      .filter(commission => commission.barbershopId === barbershopId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByAppointment(appointmentId: string, barbershopId: string): Promise<Commission | null> {
    return (
      this.commissions.find(
        commission =>
          commission.appointmentId === appointmentId && commission.barbershopId === barbershopId,
      ) ?? null
    );
  }
}
