import { Customer } from '@/domain/entities/Customer';
import ICustomerRepository from '@/domain/repository/CustomerRepository';

export default class ListCustomersUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(barbershopId: string): Promise<Customer[]> {
    return this.customerRepository.findByBarbershop(barbershopId);
  }
}
