import { Customer } from '@/domain/entities/Customer';
import ICustomerRepository from '@/domain/repository/CustomerRepository';

export default class CustomerRepositoryMemory implements ICustomerRepository {
  private customers: Customer[] = [];

  async findById(id: string, barbershopId: string): Promise<Customer | null> {
    return (
      this.customers.find(
        customer => customer.id === id && customer.barbershopId === barbershopId,
      ) ?? null
    );
  }

  async findByBarbershopAndPhone(barbershopId: string, phone: string): Promise<Customer | null> {
    const normalizedPhone = phone.trim();

    return (
      this.customers.find(
        customer => customer.barbershopId === barbershopId && customer.phone === normalizedPhone,
      ) ?? null
    );
  }

  async findByBarbershop(barbershopId: string): Promise<Customer[]> {
    return this.customers.filter(customer => customer.barbershopId === barbershopId);
  }

  async findByIds(ids: string[], barbershopId: string): Promise<Customer[]> {
    return this.customers.filter(
      customer => ids.includes(customer.id) && customer.barbershopId === barbershopId,
    );
  }

  async save(customer: Customer): Promise<Customer> {
    const existingIndex = this.customers.findIndex(item => item.id === customer.id);

    if (existingIndex !== -1) {
      this.customers[existingIndex] = customer;
    } else {
      this.customers.push(customer);
    }

    return customer;
  }

  async setVip(id: string, barbershopId: string, vip: boolean): Promise<Customer | null> {
    const index = this.customers.findIndex(
      customer => customer.id === id && customer.barbershopId === barbershopId,
    );

    if (index === -1) {
      return null;
    }

    const current = this.customers[index];
    const updated = new Customer({
      id: current.id,
      barbershopId: current.barbershopId,
      name: current.name,
      phone: current.phone,
      email: current.email,
      isActive: current.isActive,
      vip,
    });

    this.customers[index] = updated;
    return updated;
  }
}
