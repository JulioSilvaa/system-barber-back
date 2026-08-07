import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import CreateCustomerUseCase from '@/application/useCases/customer/Create';
import ListCustomersUseCase from '@/application/useCases/customer/List';
import SetCustomerVipUseCase from '@/application/useCases/customer/SetCustomerVip';
import { Customer } from '@/domain/entities/Customer';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';

type CustomerOutputDTO = {
  id: string;
  barbershopId: string;
  name: string;
  phone: string;
  email?: string;
  isActive: boolean;
  vip: boolean;
};

export default class CustomerController {
  private readonly createCustomerUseCase: CreateCustomerUseCase;
  private readonly listCustomersUseCase: ListCustomersUseCase;
  private readonly setCustomerVipUseCase: SetCustomerVipUseCase;

  constructor(
    customerRepository: ICustomerRepository = new CustomerRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.createCustomerUseCase = new CreateCustomerUseCase(
      customerRepository,
      barbershopRepository,
      auditService,
    );
    this.listCustomersUseCase = new ListCustomersUseCase(customerRepository);
    this.setCustomerVipUseCase = new SetCustomerVipUseCase(customerRepository, auditService);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const output = await this.createCustomerUseCase.execute(
        {
          barbershopId:
            req.barbershopId ??
            (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId),
          name: req.body.name,
          phone: req.body.phone,
          email: req.body.email,
        },
        buildAuditContext(req),
      );

      return res.status(201).json(toCustomerOutput(output));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const customers = await this.listCustomersUseCase.execute(
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId),
      );
      return res.status(200).json(customers.map(toCustomerOutput));
    } catch (error) {
      next(error);
    }
  };

  setVip = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.id;
      const rawBarbershopId = req.params.barbershopId;
      const customerId = Array.isArray(rawId) ? rawId[0] : rawId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);

      const customer = await this.setCustomerVipUseCase.execute(
        { customerId, barbershopId, vip: Boolean(req.body.vip) },
        buildAuditContext(req),
      );

      return res.status(200).json(toCustomerOutput(customer));
    } catch (error) {
      next(error);
    }
  };
}

function toCustomerOutput(customer: Customer): CustomerOutputDTO {
  return {
    id: customer.id,
    barbershopId: customer.barbershopId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    isActive: customer.isActive,
    vip: customer.vip,
  };
}
