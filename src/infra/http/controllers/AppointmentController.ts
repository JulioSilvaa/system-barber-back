import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import CreateAppointmentUseCase from '@/application/useCases/appointment/Create';
import CompleteAppointmentUseCase from '@/application/useCases/appointment/Complete';
import CancelAppointmentUseCase from '@/application/useCases/appointment/Cancel';
import ListDayAppointmentsUseCase from '@/application/useCases/appointment/ListDay';
import { Appointment } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

type AppointmentOutputDTO = {
  id: string;
  barbershopId: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startDate: Date;
  endDate: Date;
  status: string;
};

export default class AppointmentController {
  private readonly createAppointmentUseCase: CreateAppointmentUseCase;
  private readonly completeAppointmentUseCase: CompleteAppointmentUseCase;
  private readonly cancelAppointmentUseCase: CancelAppointmentUseCase;
  private readonly listDayAppointmentsUseCase: ListDayAppointmentsUseCase;
  private readonly customerRepository: ICustomerRepository;

  constructor(
    appointmentRepository: IAppointmentRepository = new AppointmentRepositoryMemory(),
    serviceRepository: IServiceRepository = new ServiceRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    customerRepository: ICustomerRepository = new CustomerRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
  ) {
    this.createAppointmentUseCase = new CreateAppointmentUseCase(
      appointmentRepository,
      barbershopRepository,
      serviceRepository,
      userBarbershopRepository,
      customerRepository,
      auditService,
    );
    this.completeAppointmentUseCase = new CompleteAppointmentUseCase(
      appointmentRepository,
      auditService,
    );
    this.cancelAppointmentUseCase = new CancelAppointmentUseCase(
      appointmentRepository,
      auditService,
    );
    this.listDayAppointmentsUseCase = new ListDayAppointmentsUseCase(appointmentRepository);
    this.customerRepository = customerRepository;
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const output = await this.createAppointmentUseCase.execute(
        {
          barbershopId:
            req.barbershopId ??
            (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId),
          barberId: req.body.barberId,
          serviceId: req.body.serviceId,
          customerName: req.body.customerName,
          customerPhone: req.body.customerPhone,
          customerEmail: req.body.customerEmail,
          startDate: new Date(req.body.startDate),
        },
        buildAuditContext(req),
      );

      const enriched = await this.enrich([output]);
      return res.status(201).json(enriched[0]);
    } catch (error) {
      next(error);
    }
  };

  listDay = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = parseDateQuery(req.query.date);
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const appointments = await this.listDayAppointmentsUseCase.execute(barbershopId, date);

      return res.status(200).json(await this.enrich(appointments));
    } catch (error) {
      next(error);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.id;
      const rawBarbershopId = req.params.barbershopId;
      const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);

      const output = await this.completeAppointmentUseCase.execute(
        appointmentId,
        barbershopId,
        buildAuditContext(req),
      );

      const enriched = await this.enrich([output]);
      return res.status(200).json(enriched[0]);
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.id;
      const rawBarbershopId = req.params.barbershopId;
      const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);

      const output = await this.cancelAppointmentUseCase.execute(
        appointmentId,
        barbershopId,
        buildAuditContext(req),
      );

      const enriched = await this.enrich([output]);
      return res.status(200).json(enriched[0]);
    } catch (error) {
      next(error);
    }
  };

  private async enrich(appointments: Appointment[]): Promise<AppointmentOutputDTO[]> {
    const customerIds = [...new Set(appointments.map(appointment => appointment.customerId))];
    const customers = await this.customerRepository.findByIds(customerIds);
    const customerById = new Map(customers.map(customer => [customer.id, customer]));

    return appointments.map(appointment => {
      const customer = customerById.get(appointment.customerId);

      return {
        id: appointment.id,
        barbershopId: appointment.barbershopId,
        barberId: appointment.barberId,
        serviceId: appointment.serviceId,
        customerId: appointment.customerId,
        customerName: customer?.name ?? 'Cliente não encontrado',
        customerPhone: customer?.phone ?? '',
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        status: appointment.status,
      };
    });
  }
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateQuery(value: unknown): Date {
  if (value === undefined) {
    return new Date();
  }

  if (typeof value !== 'string') {
    throw new Error('Data inválida');
  }

  const match = value.match(DATE_ONLY_PATTERN);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (Number.isNaN(date.getTime())) {
      throw new Error('Data inválida');
    }

    return date;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }

  return date;
}
