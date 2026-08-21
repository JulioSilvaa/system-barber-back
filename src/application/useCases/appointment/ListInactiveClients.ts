import { Appointment } from '@/domain/entities/Appointment';
import { Service } from '@/domain/entities/Service';
import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import ICustomerRepository from '@/domain/repository/CustomerRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';

export type InactiveClientDTO = {
  id: string;
  name: string;
  phone: string;
  lastVisitDays: number;
  lastService: string | null;
  lastVisit: string;
  estimatedLostValueCents: number;
  suggestedOffer: string;
};

const INACTIVE_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default class ListInactiveClientsUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly serviceRepository: IServiceRepository,
  ) {}

  async execute(barbershopId: string, now: Date = new Date()): Promise<InactiveClientDTO[]> {
    const appointments = await this.appointmentRepository.findAllByBarbershop(barbershopId);

    const lastCompletedByCustomer = new Map<string, Appointment>();
    const scheduledFuture = new Set<string>();

    for (const appointment of appointments) {
      if (appointment.status === 'SCHEDULED' && appointment.startDate > now) {
        scheduledFuture.add(appointment.customerId);
        continue;
      }
      if (appointment.status !== 'COMPLETED') continue;

      const last = lastCompletedByCustomer.get(appointment.customerId);
      if (!last || appointment.startDate > last.startDate) {
        lastCompletedByCustomer.set(appointment.customerId, appointment);
      }
    }

    const candidates = [...lastCompletedByCustomer.entries()]
      .filter(([customerId]) => !scheduledFuture.has(customerId))
      .map(([customerId, lastAppointment]) => ({ customerId, lastAppointment }))
      .filter(({ lastAppointment }) => {
        const days = Math.floor((now.getTime() - lastAppointment.startDate.getTime()) / MS_PER_DAY);
        return days > INACTIVE_THRESHOLD_DAYS;
      });

    if (candidates.length === 0) {
      return [];
    }

    const customers = await this.customerRepository.findByIds(
      candidates.map(c => c.customerId),
      barbershopId,
    );
    const customerById = new Map(customers.map(customer => [customer.id, customer]));

    const serviceIds = new Set(appointments.map(appointment => appointment.serviceId));
    const serviceById = new Map<string, Service>();
    for (const serviceId of serviceIds) {
      const service = await this.serviceRepository.findById(serviceId, barbershopId);
      if (service) serviceById.set(service.id, service);
    }

    const paidValuesByCustomer = new Map<string, number[]>();
    for (const appointment of appointments) {
      if (appointment.status !== 'COMPLETED') continue;
      const paid =
        appointment.pricePaidCents ?? serviceById.get(appointment.serviceId)?.priceCents ?? 0;
      const values = paidValuesByCustomer.get(appointment.customerId) ?? [];
      if (paid > 0) values.push(paid);
      paidValuesByCustomer.set(appointment.customerId, values);
    }

    const averageTicket = (customerId: string, lastAppointment: Appointment): number => {
      const values = paidValuesByCustomer.get(customerId) ?? [];
      if (values.length > 0) {
        const sum = values.reduce((total, value) => total + value, 0);
        return Math.round(sum / values.length);
      }
      return serviceById.get(lastAppointment.serviceId)?.priceCents ?? 0;
    };

    const result = candidates.map(({ customerId, lastAppointment }) => {
      const customer = customerById.get(customerId);
      const lastService = serviceById.get(lastAppointment.serviceId);
      const lastVisitDays = Math.floor(
        (now.getTime() - lastAppointment.startDate.getTime()) / MS_PER_DAY,
      );
      const estimatedLostValueCents = averageTicket(customerId, lastAppointment);

      return {
        id: customerId,
        name: customer?.name ?? 'Cliente',
        phone: customer?.phone ?? '',
        lastVisitDays,
        lastService: lastService?.name ?? null,
        lastVisit: lastAppointment.startDate.toISOString(),
        estimatedLostValueCents,
        suggestedOffer: suggestOffer(lastVisitDays, estimatedLostValueCents),
      };
    });

    return result.sort((a, b) => b.lastVisitDays - a.lastVisitDays);
  }
}

function suggestOffer(lastVisitDays: number, estimatedLostValueCents: number): string {
  if (estimatedLostValueCents >= 8000) {
    return 'Oferta de retorno com 15% de desconto no próximo corte';
  }
  if (lastVisitDays >= 60) {
    return 'Convite para uma visita expressa';
  }
  return 'Corte + barba como cortesia de retorno';
}
