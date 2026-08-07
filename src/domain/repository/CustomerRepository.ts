import { Customer } from '@/domain/entities/Customer';

export default interface ICustomerRepository {
  findById(id: string, barbershopId: string): Promise<Customer | null>;
  findByBarbershopAndPhone(barbershopId: string, phone: string): Promise<Customer | null>;
  findByBarbershop(barbershopId: string): Promise<Customer[]>;
  findByIds(ids: string[]): Promise<Customer[]>;
  save(customer: Customer): Promise<Customer>;
  setVip(id: string, barbershopId: string, vip: boolean): Promise<Customer | null>;
}
