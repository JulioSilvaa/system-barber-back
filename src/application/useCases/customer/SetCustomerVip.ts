import { NotFoundError } from '@/domain/errors';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Customer } from '@/domain/entities/Customer';
import ICustomerRepository from '@/domain/repository/CustomerRepository';

export type SetCustomerVipInput = {
  customerId: string;
  barbershopId: string;
  vip: boolean;
};

export default class SetCustomerVipUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: SetCustomerVipInput, auditCtx?: AuditContext): Promise<Customer> {
    const customer = await this.customerRepository.findById(input.customerId, input.barbershopId);
    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    if (customer.vip === input.vip) {
      return customer;
    }

    const updated = await this.customerRepository.setVip(
      input.customerId,
      input.barbershopId,
      input.vip,
    );
    if (!updated) {
      throw new NotFoundError('Cliente não encontrado');
    }

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'VIP_CHANGE',
      entityType: 'CUSTOMER',
      entityId: updated.id,
      before: { vip: customer.vip },
      after: { vip: updated.vip },
    });

    return updated;
  }
}
