import { randomUUID } from 'node:crypto';
import { Appointment } from '@/domain/entities/Appointment';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export type CreateAppointmentInputDTO = {
  barbershopId: string;
  barberId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  startDate: Date;
};

export default class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly barbershopRepository: IBarbershopRepository,
    private readonly serviceRepository: IServiceRepository,
    private readonly userBarbershopRepository: IUserBarbershopRepository,
  ) {}

  async execute(input: CreateAppointmentInputDTO): Promise<Appointment> {
    if (!input.customerName || input.customerName.trim() === '') {
      throw new Error('Nome do cliente é obrigatório');
    }

    if (!input.customerPhone || input.customerPhone.trim() === '') {
      throw new Error('Telefone do cliente é obrigatório');
    }

    if (!(input.startDate instanceof Date) || Number.isNaN(input.startDate.getTime())) {
      throw new Error('Data de início é obrigatória');
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

    const endDate = new Date(input.startDate.getTime() + service.durationMinutes * 60 * 1000);

    const appointment = new Appointment({
      id: randomUUID(),
      barbershopId: input.barbershopId,
      barberId: input.barberId,
      serviceId: input.serviceId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      startDate: input.startDate,
      endDate,
    });

    const barberAppointments = await this.appointmentRepository.findByBarberAndDate(
      input.barberId,
      input.barbershopId,
      input.startDate,
    );

    const hasConflict = barberAppointments.some(existing =>
      existing.isOverlappingWith(appointment),
    );
    if (hasConflict) {
      throw new Error('Já existe um agendamento neste horário');
    }

    return this.appointmentRepository.save(appointment);
  }
}
