import { Commission } from '@/domain/entities';

export interface ICommissionRepository {
  save(commission: Commission): Promise<Commission>;
  findByBarbershop(barbershopId: string): Promise<Commission[]>;
  findByBarber(barberId: string, barbershopId: string): Promise<Commission[]>;
  findByAppointment(appointmentId: string): Promise<Commission | null>;
}

export default ICommissionRepository;
