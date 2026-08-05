import { NextFunction, Request, Response } from 'express';

import CreateAppointmentUseCase from '@/application/useCases/appointment/Create';
import CompleteAppointmentUseCase from '@/application/useCases/appointment/Complete';
import CancelAppointmentUseCase from '@/application/useCases/appointment/Cancel';
import ListDayAppointmentsUseCase from '@/application/useCases/appointment/ListDay';
import { Appointment } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

type AppointmentOutputDTO = {
  id: string;
  barbershopId: string;
  barberId: string;
  serviceId: string;
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

  constructor(
    appointmentRepository: IAppointmentRepository = new AppointmentRepositoryMemory(),
    serviceRepository: IServiceRepository = new ServiceRepositoryMemory(),
    barbershopRepository: IBarbershopRepository = new BarbershopRepositoryMemory(),
    userBarbershopRepository: IUserBarbershopRepository = new UserBarbershopRepositoryMemory(),
  ) {
    this.createAppointmentUseCase = new CreateAppointmentUseCase(
      appointmentRepository,
      barbershopRepository,
      serviceRepository,
      userBarbershopRepository,
    );
    this.completeAppointmentUseCase = new CompleteAppointmentUseCase(appointmentRepository);
    this.cancelAppointmentUseCase = new CancelAppointmentUseCase(appointmentRepository);
    this.listDayAppointmentsUseCase = new ListDayAppointmentsUseCase(appointmentRepository);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.createAppointmentUseCase.execute({
        barbershopId: req.params.barbershopId,
        barberId: req.body.barberId,
        serviceId: req.body.serviceId,
        customerName: req.body.customerName,
        customerPhone: req.body.customerPhone,
        startDate: new Date(req.body.startDate),
      });

      return res.status(201).json(toAppointmentOutput(output));
    } catch (error) {
      next(error);
    }
  };

  listDay = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = parseDateQuery(req.query.date);
      const appointments = await this.listDayAppointmentsUseCase.execute(
        req.params.barbershopId,
        date,
      );

      return res.status(200).json(appointments.map(toAppointmentOutput));
    } catch (error) {
      next(error);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.completeAppointmentUseCase.execute(
        req.params.id,
        req.params.barbershopId,
      );

      return res.status(200).json(toAppointmentOutput(output));
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const output = await this.cancelAppointmentUseCase.execute(
        req.params.id,
        req.params.barbershopId,
      );

      return res.status(200).json(toAppointmentOutput(output));
    } catch (error) {
      next(error);
    }
  };
}

function toAppointmentOutput(appointment: Appointment): AppointmentOutputDTO {
  return {
    id: appointment.id,
    barbershopId: appointment.barbershopId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    status: appointment.status,
  };
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
