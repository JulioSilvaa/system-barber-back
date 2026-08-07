import { randomUUID } from 'node:crypto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Customer } from '@/domain/entities/Customer';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';

export type CreateCustomerInputDTO = {
  barbershopId: string;
  name: string;
  phone: string;
  email?: string;
};

export default class CreateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: CreateCustomerInputDTO, auditCtx?: AuditContext): Promise<Customer> {
    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    const existing = await this.customerRepository.findByBarbershopAndPhone(
      input.barbershopId,
      input.phone,
    );
    if (existing) {
      throw new Error('Cliente já cadastrado');
    }

    const customer = new Customer({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      name: input.name,
      phone: input.phone,
      email: input.email,
    });

    const saved = await this.customerRepository.save(customer);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: saved.id,
      after: {
        id: saved.id,
        name: saved.name,
        phone: saved.phone,
        vip: saved.vip,
        barbershopId: saved.barbershopId,
      },
    });

    return saved;
  }
}
