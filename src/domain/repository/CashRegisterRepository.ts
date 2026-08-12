import { CashRegister } from '@/domain/entities';
import { CashRegisterMovement } from '@/domain/entities';

export interface ICashRegisterRepository {
  save(register: CashRegister): Promise<CashRegister>;
  findOpenByBarbershop(barbershopId: string): Promise<CashRegister | null>;
  findById(id: string, barbershopId: string): Promise<CashRegister | null>;
  findByBarbershop(barbershopId: string): Promise<CashRegister[]>;
  saveMovement(movement: CashRegisterMovement): Promise<CashRegisterMovement>;
  listMovements(cashRegisterId: string): Promise<CashRegisterMovement[]>;
}

export default ICashRegisterRepository;
