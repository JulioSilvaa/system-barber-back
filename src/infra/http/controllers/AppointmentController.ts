import { NextFunction, Request, Response } from 'express';

import AuditService from '@/application/services/AuditService';
import CreateAppointmentUseCase from '@/application/useCases/appointment/Create';
import CompleteAppointmentUseCase from '@/application/useCases/appointment/Complete';
import CancelAppointmentUseCase from '@/application/useCases/appointment/Cancel';
import GetAvailableSlotsUseCase from '@/application/useCases/appointment/GetAvailableSlots';
import ListDayAppointmentsUseCase from '@/application/useCases/appointment/ListDay';
import { Appointment } from '@/domain/entities/Appointment';
import { Service } from '@/domain/entities/Service';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import { buildAuditContext } from '@/infra/http/helpers/auditContext';
import { emitToBarbershop, emitDataChanged } from '@/infra/websocket/socketServer';
import AuditRepositoryMemory from '@/infra/repositories/inMemory/audit/auditRepositoryMemory';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';

type AppointmentOutputDTO = {
  id: string;
  barbershopId: string;
  barberId: string;
  serviceId: string;
  serviceName?: string;
  priceCents?: number;
  durationMinutes?: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startDate: Date;
  endDate: Date;
  status: string;
  pricePaidCents?: number | null;
  paymentMethod?: string | null;
  note?: string | null;
};

export default class AppointmentController {
  private readonly createAppointmentUseCase: CreateAppointmentUseCase;
  private readonly completeAppointmentUseCase: CompleteAppointmentUseCase;
  private readonly cancelAppointmentUseCase: CancelAppointmentUseCase;
  private readonly listDayAppointmentsUseCase: ListDayAppointmentsUseCase;
  private readonly getAvailableSlotsUseCase: GetAvailableSlotsUseCase;
  private readonly customerRepository: ICustomerRepository;
  private readonly serviceRepository: IServiceRepository;

  constructor(
    appointmentRepository: IAppointmentRepository = new AppointmentRepositoryMemory(),
    serviceRepository: IServiceRepository = new ServiceRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
    customerRepository: ICustomerRepository = new CustomerRepositoryMemory(),
    auditService: AuditService = new AuditService(new AuditRepositoryMemory()),
    commissionRepository: ICommissionRepository = new CommissionRepositoryMemory(),
    workingHoursRepository: IWorkingHoursRepository = new WorkingHoursRepositoryMemory(),
  ) {
    this.createAppointmentUseCase = new CreateAppointmentUseCase(
      appointmentRepository,
      barbershopRepository,
      serviceRepository,
      userBarbershopRepository,
      customerRepository,
      auditService,
      workingHoursRepository,
    );
    this.completeAppointmentUseCase = new CompleteAppointmentUseCase(
      appointmentRepository,
      serviceRepository,
      userBarbershopRepository,
      commissionRepository,
      auditService,
    );
    this.cancelAppointmentUseCase = new CancelAppointmentUseCase(
      appointmentRepository,
      auditService,
    );
    this.listDayAppointmentsUseCase = new ListDayAppointmentsUseCase(appointmentRepository);
    this.getAvailableSlotsUseCase = new GetAvailableSlotsUseCase(
      appointmentRepository,
      serviceRepository,
      workingHoursRepository,
    );
    this.customerRepository = customerRepository;
    this.serviceRepository = serviceRepository;
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

      emitToBarbershop(output.barbershopId, 'appointment:created', enriched[0]);

      return res.status(201).json(enriched[0]);
    } catch (error) {
      next(error);
    }
  };

  listDay = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = req.query.date === undefined ? null : parseDateQuery(req.query.date);
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const appointments = await this.listDayAppointmentsUseCase.execute(barbershopId, date);

      return res.status(200).json(await this.enrich(appointments));
    } catch (error) {
      next(error);
    }
  };

  listBusy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = parseDateQuery(req.query.date);
      const rawBarbershopId = req.params.identifier ?? req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const appointments = await this.listDayAppointmentsUseCase.execute(barbershopId, date);

      const busy = appointments
        .filter(appointment => appointment.status === 'SCHEDULED')
        .map(appointment => ({
          id: appointment.id,
          barberId: appointment.barberId,
          startDate: appointment.startDate,
          endDate: appointment.endDate,
          status: appointment.status,
        }));

      return res.status(200).json(busy);
    } catch (error) {
      next(error);
    }
  };

  getSlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = parseDateQuery(req.query.date);
      const rawBarbershopId = req.params.identifier ?? req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const barberId = req.query.barberId ? String(req.query.barberId) : null;
      const serviceId = req.query.serviceId ? String(req.query.serviceId) : '';

      const slots = await this.getAvailableSlotsUseCase.execute({
        barbershopId,
        date,
        serviceId,
        barberId,
      });

      return res.status(200).json(slots);
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
      const body = req.body ?? {};

      const output = await this.completeAppointmentUseCase.execute(
        {
          appointmentId,
          barbershopId,
          paidPriceCents: body.paidPriceCents,
          paymentMethod: body.paymentMethod,
          note: body.note,
        },
        buildAuditContext(req),
      );

      const enriched = await this.enrich([output]);
      emitDataChanged(barbershopId);
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
      emitDataChanged(barbershopId);
      return res.status(200).json(enriched[0]);
    } catch (error) {
      next(error);
    }
  };

  private async enrich(appointments: Appointment[]): Promise<AppointmentOutputDTO[]> {
    const customerIds = [...new Set(appointments.map(appointment => appointment.customerId))];
    const customers = await this.customerRepository.findByIds(customerIds);
    const customerById = new Map(customers.map(customer => [customer.id, customer]));

    const serviceById = new Map<string, Service>();
    for (const appointment of appointments) {
      if (serviceById.has(appointment.serviceId)) continue;
      const service = await this.serviceRepository.findById(
        appointment.serviceId,
        appointment.barbershopId,
      );
      if (service) serviceById.set(appointment.serviceId, service);
    }

    return appointments.map(appointment => {
      const customer = customerById.get(appointment.customerId);
      const service = serviceById.get(appointment.serviceId);

      return {
        id: appointment.id,
        barbershopId: appointment.barbershopId,
        barberId: appointment.barberId,
        serviceId: appointment.serviceId,
        serviceName: service?.name,
        priceCents: service?.priceCents,
        durationMinutes: service?.durationMinutes,
        customerId: appointment.customerId,
        customerName: customer?.name ?? 'Cliente não encontrado',
        customerPhone: customer?.phone ?? '',
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        status: appointment.status,
        pricePaidCents: appointment.pricePaidCents ?? null,
        paymentMethod: appointment.paymentMethod ?? null,
        note: appointment.note ?? null,
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
