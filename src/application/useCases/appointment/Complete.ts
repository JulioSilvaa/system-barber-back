import { ValidationError, NotFoundError } from '@/domain/errors';
import { randomUUID } from 'node:crypto';

import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Appointment, AppointmentPaymentMethod } from '@/domain/entities/Appointment';
import { Commission } from '@/domain/entities';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';

export type CompleteAppointmentInputDTO = {
  appointmentId: string;
  barbershopId: string;
  paidPriceCents?: number | null;
  paymentMethod?: AppointmentPaymentMethod | null;
  note?: string | null;
};

export default class CompleteAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly serviceRepository: IServiceRepository,
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly commissionRepository: ICommissionRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: CompleteAppointmentInputDTO, auditCtx?: AuditContext): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.barbershopId,
    );
    if (!appointment) {
      throw new NotFoundError('Agendamento não encontrado');
    }

    if (appointment.status === 'CANCELLED') {
      throw new ValidationError('appointment canceled');
    }

    const paidPriceCents = input.paidPriceCents ?? (await this.servicePrice(appointment)) ?? 0;
    const paymentMethod: AppointmentPaymentMethod = input.paymentMethod ?? 'CASH';

    const before = {
      id: appointment.id,
      status: appointment.status,
      pricePaidCents: appointment.pricePaidCents,
      paymentMethod: appointment.paymentMethod,
      note: appointment.note,
    };
    appointment.complete({ pricePaidCents: paidPriceCents, paymentMethod, note: input.note });

    const commission = await this.createCommission(appointment, paidPriceCents);

    const saved = await this.appointmentRepository.update(appointment);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'COMPLETE',
      entityType: 'APPOINTMENT',
      entityId: saved.id,
      before,
      after: {
        id: saved.id,
        status: saved.status,
        pricePaidCents: saved.pricePaidCents,
        paymentMethod: saved.paymentMethod,
        note: saved.note,
        commissionCents: commission?.commissionCents ?? 0,
      },
    });

    return saved;
  }

  private async servicePrice(appointment: Appointment): Promise<number | null> {
    const service = await this.serviceRepository.findById(
      appointment.serviceId,
      appointment.barbershopId,
    );
    return service?.priceCents ?? null;
  }

  private async createCommission(
    appointment: Appointment,
    priceCents: number,
  ): Promise<Commission | null> {
    const membership = await this.userBarbershopRepository.findByUserAndBarbershop(
      appointment.barberId,
      appointment.barbershopId,
    );
    const rate = membership?.commissionRate ?? 0;

    if (rate <= 0) {
      return null;
    }

    const commission = new Commission({
      id: randomUUID(),
      barbershopId: appointment.barbershopId,
      barberId: appointment.barberId,
      appointmentId: appointment.id,
      serviceValueCents: priceCents,
      commissionCents: Math.round((priceCents * rate) / 100),
      rate,
    });

    return this.commissionRepository.save(commission);
  }
}
