import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
import IUserRepository from '@/domain/repository/UserRepository';
import { timeToMinutes } from '@/application/useCases/appointment/workingHours';

export type FinancialDashboardDTO = {
  period: {
    weekStart: Date;
    weekEnd: Date;
    monthStart: Date;
    monthEnd: Date;
  };
  revenue: { todayCents: number; weekCents: number; monthCents: number };
  forecast: { todayCents: number; weekCents: number; monthCents: number };
  completed: { week: number; month: number };
  commission: {
    weekTotalCents: number;
    monthTotalCents: number;
    payableWeekCents: number;
    payableMonthCents: number;
    byBarber: CommissionByBarberDTO[];
  };
  occupancy: {
    week: OccupancyDTO | null;
    month: OccupancyDTO | null;
  };
  paymentMethods: {
    week: PaymentMethodsDTO;
    month: PaymentMethodsDTO;
  };
  revenueByService: {
    week: ServiceRevenueDTO[];
    month: ServiceRevenueDTO[];
  };
  ticketAverageCents: { week: number | null; month: number | null };
  cash: { balanceCents: number; projectedMonthCents: number };
};

export type OccupancyDTO = {
  rate: number | null;
  occupiedMinutes: number;
  availableMinutes: number;
};

export type PaymentMethodsDTO = {
  pixCents: number;
  cardCents: number;
  debitCents: number;
  creditCents: number;
  cashCents: number;
  count: number;
};

export type ServiceRevenueDTO = {
  serviceId: string;
  serviceName: string;
  cents: number;
  count: number;
};

export type CommissionByBarberDTO = {
  barberId: string;
  barberName: string;
  commissionCents: number;
  payableCents: number;
  count: number;
};

export default class GetFinancialDashboardUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly commissionRepository: ICommissionRepository,
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly workingHoursRepository: IWorkingHoursRepository,
    private readonly serviceRepository: IServiceRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(barbershopId: string): Promise<FinancialDashboardDTO> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const weekStart = startOfWeek(todayStart);
    const weekEnd = endOfDay(addDays(weekStart, 6));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const [appointments, commissions, activeBarbers, workingHours, services] = await Promise.all([
      this.appointmentRepository.findAllByBarbershop(barbershopId),
      this.commissionRepository.findByBarbershop(barbershopId),
      this.userBarbershopRepository.findActiveByBarbershop(barbershopId),
      this.workingHoursRepository.findAll(barbershopId),
      this.serviceRepository.findAll(barbershopId),
    ]);

    const priceByService = new Map(services.map(service => [service.id, service.priceCents ?? 0]));
    const nameByService = new Map(services.map(service => [service.id, service.name]));

    const completedInWeek = appointments.filter(
      a => a.status === 'COMPLETED' && a.startDate >= weekStart && a.startDate < weekEnd,
    );
    const completedInMonth = appointments.filter(
      a => a.status === 'COMPLETED' && a.startDate >= monthStart && a.startDate < monthEnd,
    );

    const todayCents = appointments
      .filter(
        a =>
          a.status === 'COMPLETED' &&
          a.startDate >= todayStart &&
          a.startDate < endOfDay(todayStart),
      )
      .reduce((sum, a) => sum + (a.pricePaidCents ?? 0), 0);
    const weekCents = completedInWeek.reduce((sum, a) => sum + (a.pricePaidCents ?? 0), 0);
    const monthCents = completedInMonth.reduce((sum, a) => sum + (a.pricePaidCents ?? 0), 0);

    const weekCommissions = commissions.filter(
      c => c.createdAt >= weekStart && c.createdAt < weekEnd,
    );
    const monthCommissions = commissions.filter(
      c => c.createdAt >= monthStart && c.createdAt < monthEnd,
    );

    const weekCommission = weekCommissions.reduce((sum, c) => sum + c.commissionCents, 0);
    const monthCommission = monthCommissions.reduce((sum, c) => sum + c.commissionCents, 0);
    const payableWeekCents = weekCommissions
      .filter(c => !c.isPaid)
      .reduce((sum, c) => sum + c.commissionCents, 0);
    const payableMonthCents = monthCommissions
      .filter(c => !c.isPaid)
      .reduce((sum, c) => sum + c.commissionCents, 0);

    const commissionByBarber = await this.commissionByBarber(monthCommissions);

    const barberCount = activeBarbers.filter(barber => barber.isBarber()).length;
    const whByDay = new Map(workingHours.map(wh => [wh.dayOfWeek, wh]));

    const occupiedWeek = this.occupiedMinutes(appointments, weekStart, weekEnd);
    const availableWeek = this.availableMinutes(weekStart, weekEnd, barberCount, whByDay);
    const occupiedMonth = this.occupiedMinutes(appointments, monthStart, monthEnd);
    const availableMonth = this.availableMinutes(monthStart, monthEnd, barberCount, whByDay);

    const scheduledInWeek = appointments.filter(
      a => a.status === 'SCHEDULED' && a.startDate >= weekStart && a.startDate < weekEnd,
    );
    const scheduledInMonth = appointments.filter(
      a => a.status === 'SCHEDULED' && a.startDate >= monthStart && a.startDate < monthEnd,
    );

    const todayForecastCents = appointments
      .filter(
        a =>
          a.status === 'SCHEDULED' &&
          a.startDate >= todayStart &&
          a.startDate < endOfDay(todayStart),
      )
      .reduce((sum, a) => sum + (priceByService.get(a.serviceId) ?? 0), 0);
    const weekForecastCents = scheduledInWeek.reduce(
      (sum, a) => sum + (priceByService.get(a.serviceId) ?? 0),
      0,
    );
    const monthForecastCents = scheduledInMonth.reduce(
      (sum, a) => sum + (priceByService.get(a.serviceId) ?? 0),
      0,
    );

    const monthTicketAverage = average(completedInMonth, a => a.pricePaidCents ?? 0);

    return {
      period: { weekStart, weekEnd, monthStart, monthEnd },
      revenue: { todayCents, weekCents, monthCents },
      forecast: {
        todayCents: todayForecastCents,
        weekCents: weekForecastCents,
        monthCents: monthForecastCents,
      },
      completed: { week: completedInWeek.length, month: completedInMonth.length },
      commission: {
        weekTotalCents: weekCommission,
        monthTotalCents: monthCommission,
        payableWeekCents,
        payableMonthCents,
        byBarber: commissionByBarber,
      },
      occupancy: {
        week: this.occupancy(occupiedWeek, availableWeek),
        month: this.occupancy(occupiedMonth, availableMonth),
      },
      paymentMethods: {
        week: this.paymentMethods(completedInWeek),
        month: this.paymentMethods(completedInMonth),
      },
      revenueByService: {
        week: this.revenueByService(completedInWeek, nameByService),
        month: this.revenueByService(completedInMonth, nameByService),
      },
      ticketAverageCents: {
        week: average(completedInWeek, a => a.pricePaidCents ?? 0),
        month: monthTicketAverage,
      },
      cash: {
        balanceCents: monthCents - payableMonthCents,
        projectedMonthCents: monthCents + monthForecastCents - monthCommission,
      },
    };
  }

  private paymentMethods(
    completed: { paymentMethod: string | null; pricePaidCents: number | null }[],
  ): PaymentMethodsDTO {
    const result: PaymentMethodsDTO = {
      pixCents: 0,
      cardCents: 0,
      debitCents: 0,
      creditCents: 0,
      cashCents: 0,
      count: completed.length,
    };

    for (const appointment of completed) {
      const cents = appointment.pricePaidCents ?? 0;
      switch (appointment.paymentMethod) {
        case 'PIX':
          result.pixCents += cents;
          break;
        case 'CARD':
          result.cardCents += cents;
          break;
        case 'DEBIT':
          result.debitCents += cents;
          break;
        case 'CREDIT':
          result.creditCents += cents;
          break;
        case 'CASH':
          result.cashCents += cents;
          break;
        default:
          break;
      }
    }

    return result;
  }

  private revenueByService(
    completed: { serviceId: string; pricePaidCents: number | null }[],
    nameByService: Map<string, string>,
  ): ServiceRevenueDTO[] {
    const byService = new Map<string, ServiceRevenueDTO>();

    for (const appointment of completed) {
      const serviceId = appointment.serviceId;
      const current = byService.get(serviceId) ?? {
        serviceId,
        serviceName: nameByService.get(serviceId) ?? 'Serviço',
        cents: 0,
        count: 0,
      };
      current.cents += appointment.pricePaidCents ?? 0;
      current.count += 1;
      byService.set(serviceId, current);
    }

    return [...byService.values()].sort((a, b) => b.cents - a.cents);
  }

  private async commissionByBarber(
    commissions: { barberId: string; commissionCents: number; isPaid: boolean }[],
  ): Promise<CommissionByBarberDTO[]> {
    const byBarber = new Map<string, CommissionByBarberDTO>();

    for (const commission of commissions) {
      const current = byBarber.get(commission.barberId) ?? {
        barberId: commission.barberId,
        barberName: 'Barbeiro',
        commissionCents: 0,
        payableCents: 0,
        count: 0,
      };
      current.commissionCents += commission.commissionCents;
      if (!commission.isPaid) {
        current.payableCents += commission.commissionCents;
      }
      current.count += 1;
      byBarber.set(commission.barberId, current);
    }

    const barberIds = [...byBarber.keys()];
    if (barberIds.length > 0) {
      const users = await this.userRepository.findByIds(barberIds);
      const nameById = new Map(users.map(user => [user.id, user.name]));
      for (const [barberId, entry] of byBarber) {
        entry.barberName = nameById.get(barberId) ?? entry.barberName;
      }
    }

    return [...byBarber.values()].sort((a, b) => b.commissionCents - a.commissionCents);
  }

  private occupiedMinutes(
    appointments: { startDate: Date; endDate: Date; status: string }[],
    from: Date,
    to: Date,
  ): number {
    return appointments
      .filter(a => a.status !== 'CANCELLED' && a.startDate >= from && a.startDate < to)
      .reduce(
        (sum, a) => sum + Math.max(0, (a.endDate.getTime() - a.startDate.getTime()) / 60000),
        0,
      );
  }

  private availableMinutes(
    from: Date,
    to: Date,
    barberCount: number,
    whByDay: Map<number, { isOpen: boolean; openTime: string | null; closeTime: string | null }>,
  ): number {
    if (barberCount <= 0) {
      return 0;
    }

    let total = 0;
    const cursor = new Date(from);
    while (cursor < to) {
      const wh = whByDay.get(cursor.getDay());
      total += (wh ? minutesPerDay(wh) : 0) * barberCount;
      cursor.setDate(cursor.getDate() + 1);
    }
    return total;
  }

  private occupancy(occupiedMinutes: number, availableMinutes: number): OccupancyDTO | null {
    if (availableMinutes <= 0) {
      return { rate: null, occupiedMinutes, availableMinutes: 0 };
    }

    return {
      rate: Math.round((occupiedMinutes / availableMinutes) * 100),
      occupiedMinutes,
      availableMinutes,
    };
  }
}

function minutesPerDay(wh: {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}): number {
  if (!wh.isOpen || !wh.openTime || !wh.closeTime) {
    return 0;
  }
  return Math.max(0, timeToMinutes(wh.closeTime) - timeToMinutes(wh.openTime));
}

function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function average(
  items: { pricePaidCents: number | null }[],
  pick: (item: { pricePaidCents: number | null }) => number,
): number | null {
  if (items.length === 0) {
    return null;
  }
  return Math.round(items.reduce((sum, item) => sum + pick(item), 0) / items.length);
}
