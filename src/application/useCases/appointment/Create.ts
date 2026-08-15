import { randomUUID } from 'node:crypto';
import AuditService, { AuditContext } from '@/application/services/AuditService';
import { Appointment } from '@/domain/entities/Appointment';
import { Customer } from '@/domain/entities/Customer';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import {
  resolveWorkingHours,
  timeToMinutes,
} from '@/application/useCases/appointment/workingHours';

export type CreateAppointmentInputDTO = {
  barbershopId: string;
  barberId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startDate: Date;
};

export default class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly serviceRepository: IServiceRepository,
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly workingHoursRepository: IWorkingHoursRepository,
    private readonly auditService?: AuditService,
  ) {}

  async execute(input: CreateAppointmentInputDTO, auditCtx?: AuditContext): Promise<Appointment> {
    if (!input.customerName || input.customerName.trim() === '') {
      throw new Error('Nome do cliente é obrigatório');
    }

    if (!input.customerPhone || input.customerPhone.trim() === '') {
      throw new Error('Telefone do cliente é obrigatório');
    }

    if (!(input.startDate instanceof Date) || Number.isNaN(input.startDate.getTime())) {
      throw new Error('Data de início é obrigatória');
    }

    if (input.startDate.getTime() < Date.now()) {
      throw new Error('Não é possível agendar em um horário no passado');
    }

    const barbershop = await this.barbershopRepository.findById(input.barbershopId);
    if (!barbershop) {
      throw new Error('Barbearia não encontrada');
    }

    const barberMembership = await this.userBarbershopRepository.findByUserAndBarbershop(
      input.barberId,
      input.barbershopId,
    );
    if (!barberMembership || !barberMembership.isActive()) {
      throw new Error('Barbeiro não encontrado');
    }

    const service = await this.serviceRepository.findById(input.serviceId, input.barbershopId);
    if (!service || !service.isActive) {
      throw new Error('Serviço não encontrado');
    }

    await this.validateWorkingHours(input, service.durationMinutes);

    const customer = await this.getOrCreateCustomer(input);

    const endDate = new Date(input.startDate.getTime() + service.durationMinutes * 60 * 1000);

    const appointment = new Appointment({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      barberId: input.barberId,
      serviceId: input.serviceId,
      customerId: customer.id,
      startDate: input.startDate,
      endDate,
    });

    const barberAppointments = await this.appointmentRepository.findByBarberAndDate(
      input.barberId,
      input.barbershopId,
      input.startDate,
    );

    const hasConflict = barberAppointments.some(
      existing => existing.status === 'SCHEDULED' && existing.isOverlappingWith(appointment),
    );
    if (hasConflict) {
      throw new Error('Já existe um agendamento neste horário');
    }

    const saved = await this.appointmentRepository.save(appointment);

    await this.auditService?.record({
      ...auditCtx,
      barbershopId: input.barbershopId,
      action: 'CREATE',
      entityType: 'APPOINTMENT',
      entityId: saved.id,
      after: {
        id: saved.id,
        barberId: saved.barberId,
        serviceId: saved.serviceId,
        customerId: saved.customerId,
        startDate: saved.startDate,
        endDate: saved.endDate,
        status: saved.status,
      },
    });

    return saved;
  }

  private async validateWorkingHours(
    input: CreateAppointmentInputDTO,
    durationMinutes: number,
  ): Promise<void> {
    const workingHours = await resolveWorkingHours(
      this.workingHoursRepository,
      input.barbershopId,
      input.barberId,
    );
    const dayHours = workingHours.find(wh => wh.dayOfWeek === input.startDate.getDay());

    if (dayHours && (!dayHours.isOpen || !dayHours.openTime || !dayHours.closeTime)) {
      throw new Error('Barbearia fechada neste dia');
    }

    if (!dayHours?.openTime || !dayHours?.closeTime) {
      return;
    }

    const startMinute = timeToMinutes(dayHours.openTime);
    const endMinute = timeToMinutes(dayHours.closeTime);
    const appointmentStartMinute = input.startDate.getHours() * 60 + input.startDate.getMinutes();
    const appointmentEndMinute = appointmentStartMinute + durationMinutes;

    if (appointmentStartMinute < startMinute || appointmentEndMinute > endMinute) {
      throw new Error('Horário fora do expediente');
    }
  }

  private async getOrCreateCustomer(input: CreateAppointmentInputDTO): Promise<Customer> {
    const existing = await this.customerRepository.findByBarbershopAndPhone(
      input.barbershopId,
      input.customerPhone,
    );

    if (existing) {
      return existing;
    }

    const customer = new Customer({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      name: input.customerName,
      phone: input.customerPhone,
      email: input.customerEmail,
    });

    return this.customerRepository.save(customer);
  }
}
