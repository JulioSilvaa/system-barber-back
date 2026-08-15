import { IAppointmentRepository } from '@/domain/repository/AppointmentRepository';
import ICommissionRepository from '@/domain/repository/CommissionRepository';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';
import { IWorkingHoursRepository } from '@/domain/repository/WorkingHoursRepository';
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
  commission: { weekTotalCents: number; monthTotalCents: number };
  occupancy: {
    week: OccupancyDTO | null;
    month: OccupancyDTO | null;
  };
};

export type OccupancyDTO = {
  rate: number | null;
  occupiedMinutes: number;
  availableMinutes: number;
};

const DEFAULT_OPEN_MINUTES_FALLBACK = 480;

export default class GetFinancialDashboardUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly commissionRepository: ICommissionRepository,
    private readonly userBarbershopRepository: IUserBarbershopRepository,
    private readonly workingHoursRepository: IWorkingHoursRepository,
    private readonly serviceRepository: IServiceRepository,
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

    const weekCommission = commissions
      .filter(c => c.createdAt >= weekStart && c.createdAt < weekEnd)
      .reduce((sum, c) => sum + c.commissionCents, 0);
    const monthCommission = commissions
      .filter(c => c.createdAt >= monthStart && c.createdAt < monthEnd)
      .reduce((sum, c) => sum + c.commissionCents, 0);

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

    return {
      period: { weekStart, weekEnd, monthStart, monthEnd },
      revenue: { todayCents, weekCents, monthCents },
      forecast: {
        todayCents: todayForecastCents,
        weekCents: weekForecastCents,
        monthCents: monthForecastCents,
      },
      completed: { week: completedInWeek.length, month: completedInMonth.length },
      commission: { weekTotalCents: weekCommission, monthTotalCents: monthCommission },
      occupancy: {
        week: this.occupancy(occupiedWeek, availableWeek),
        month: this.occupancy(occupiedMonth, availableMonth),
      },
    };
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
      const openMinutes = wh ? minutesPerDay(wh) : null;
      total += (openMinutes ?? DEFAULT_OPEN_MINUTES_FALLBACK) * barberCount;
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
