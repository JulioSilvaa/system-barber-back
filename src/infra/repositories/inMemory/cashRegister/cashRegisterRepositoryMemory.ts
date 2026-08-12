import { CashRegister, CashRegisterMovement } from '@/domain/entities';
import ICashRegisterRepository from '@/domain/repository/CashRegisterRepository';

export default class CashRegisterRepositoryMemory implements ICashRegisterRepository {
  private registers: CashRegister[] = [];
  private movements: CashRegisterMovement[] = [];

  async save(register: CashRegister): Promise<CashRegister> {
    const existingIndex = this.registers.findIndex(item => item.id === register.id);
    if (existingIndex !== -1) {
      this.registers[existingIndex] = register;
    } else {
      this.registers.push(register);
    }
    return register;
  }

  async findOpenByBarbershop(barbershopId: string): Promise<CashRegister | null> {
    return (
      this.registers.find(
        register => register.barbershopId === barbershopId && register.isOpen(),
      ) ?? null
    );
  }

  async findById(id: string, barbershopId: string): Promise<CashRegister | null> {
    return (
      this.registers.find(
        register => register.id === id && register.barbershopId === barbershopId,
      ) ?? null
    );
  }

  async findByBarbershop(barbershopId: string): Promise<CashRegister[]> {
    return this.registers
      .filter(register => register.barbershopId === barbershopId)
      .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
  }

  async saveMovement(movement: CashRegisterMovement): Promise<CashRegisterMovement> {
    this.movements.push(movement);
    return movement;
  }

  async listMovements(cashRegisterId: string): Promise<CashRegisterMovement[]> {
    return this.movements
      .filter(movement => movement.cashRegisterId === cashRegisterId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
