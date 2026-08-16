import { beforeEach, describe, expect, it } from 'vitest';
import GetFinancialDashboardUseCase from '@/application/useCases/finance/GetFinancialDashboard';
import { Appointment } from '@/domain/entities/Appointment';
import { Commission, User } from '@/domain/entities';
import { UserBarbershop } from '@/domain/entities';
import { WorkingHours } from '@/domain/entities/WorkingHours';
import { makeAppointmentProps } from '@/tests/helpers/factories';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import { Service } from '@/domain/entities/Service';
import { makeServiceProps } from '@/tests/helpers/factories';

function daysFromToday(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function weekStart(): Date {
  const result = new Date();
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function atWeekDay(offset: number, hour = 10): Date {
  const date = weekStart();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

describe('GetFinancialDashboardUseCase', () => {
  let appointmentRepository: AppointmentRepositoryMemory;
  let commissionRepository: CommissionRepositoryMemory;
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let workingHoursRepository: WorkingHoursRepositoryMemory;
  let serviceRepository: ServiceRepositoryMemory;
  let userRepository: UserRepositoryMemory;

  const BARBERSHOP_ID = 'barbershop-1';
  const BARBER_ID = 'barber-1';
  const SERVICE_ID = 'service-1';

  function makeDashboard() {
    return new GetFinancialDashboardUseCase(
      appointmentRepository,
      commissionRepository,
      userBarbershopRepository,
      workingHoursRepository,
      serviceRepository,
      userRepository,
    );
  }

  beforeEach(async () => {
    appointmentRepository = new AppointmentRepositoryMemory();
    commissionRepository = new CommissionRepositoryMemory();
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    workingHoursRepository = new WorkingHoursRepositoryMemory();
    serviceRepository = new ServiceRepositoryMemory();
    userRepository = new UserRepositoryMemory();

    await serviceRepository.save(
      new Service(makeServiceProps({ id: SERVICE_ID, barbershopId: BARBERSHOP_ID })),
    );

    await userBarbershopRepository.save(
      new UserBarbershop({
        id: 'membership-1',
        userId: BARBER_ID,
        barbershopId: BARBERSHOP_ID,
        localRole: 'BARBER',
      }),
    );

    await userRepository.save(
      new User({
        id: BARBER_ID,
        name: 'Barbeiro Um',
        email: 'barber-1@example.com',
      }),
    );

    for (let day = 0; day < 7; day++) {
      await workingHoursRepository.save(
        new WorkingHours({
          id: `wh-${day}`,
          barbershopId: BARBERSHOP_ID,
          dayOfWeek: day,
          isOpen: true,
          openTime: '09:00',
          closeTime: '19:00',
        }),
      );
    }
  });

  async function seedCompletedAppointment(
    id: string,
    startDate: Date,
    priceCents: number,
    paymentMethod: 'PIX' | 'CASH' | 'DEBIT' | 'CREDIT' = 'PIX',
    serviceId: string = SERVICE_ID,
  ) {
    const appointment = new Appointment(
      makeAppointmentProps({
        id,
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        serviceId,
        startDate,
        endDate: new Date(startDate.getTime() + 30 * 60000),
        status: 'COMPLETED',
        pricePaidCents: priceCents,
        paymentMethod,
      }),
    );
    await appointmentRepository.save(appointment);
  }

  it('calcula faturamento da semana e do mês apenas de concluídos', async () => {
    const now = new Date();
    await seedCompletedAppointment('a1', daysFromToday(-2), 4000);
    await seedCompletedAppointment('a2', daysFromToday(-1), 5000);
    await seedCompletedAppointment('a3', daysFromToday(0), 3000);
    const a4Date = daysFromToday(-40);
    await seedCompletedAppointment('a4', a4Date, 9000);

    await appointmentRepository.save(
      new Appointment(
        makeAppointmentProps({
          id: 'a5',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
          startDate: daysFromToday(0),
          endDate: new Date(daysFromToday(0).getTime() + 30 * 60000),
          status: 'SCHEDULED',
        }),
      ),
    );

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    const a4InThisMonth =
      a4Date.getMonth() === now.getMonth() && a4Date.getFullYear() === now.getFullYear();

    expect(dashboard.completed.week).toBe(3);
    expect(dashboard.completed.month).toBe(a4InThisMonth ? 4 : 3);
    expect(dashboard.revenue.weekCents).toBe(12000);
    expect(dashboard.revenue.monthCents).toBe(a4InThisMonth ? 21000 : 12000);
  });

  it('soma comissões geradas no período', async () => {
    await commissionRepository.save(
      new Commission({
        id: 'c1',
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        appointmentId: null,
        serviceValueCents: 5000,
        commissionCents: 750,
        rate: 15,
      }),
    );

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    expect(dashboard.commission.weekTotalCents).toBe(750);
    expect(dashboard.commission.monthTotalCents).toBe(750);
  });

  it('calcula taxa de ocupação usando horário de funcionamento e barbeiros ativos', async () => {
    await seedCompletedAppointment('b1', atWeekDay(0), 4000);
    await seedCompletedAppointment('b2', atWeekDay(1), 4000);

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    const week = dashboard.occupancy.week;
    expect(week).not.toBeNull();
    expect(week?.occupiedMinutes).toBe(60);
    // 7 dias x 600 min x 1 barbeiro
    expect(week?.availableMinutes).toBe(4200);
    expect(week?.rate).toBe(1);
  });

  it('retorna N/A de ocupação quando não há expediente configurado', async () => {
    await userBarbershopRepository.save(
      new UserBarbershop({
        id: 'membership-no-wh',
        userId: BARBER_ID,
        barbershopId: 'barbershop-no-wh',
        localRole: 'BARBER',
      }),
    );

    const start = atWeekDay(0);
    await appointmentRepository.save(
      new Appointment(
        makeAppointmentProps({
          id: 'b-no-wh',
          barbershopId: 'barbershop-no-wh',
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
          startDate: start,
          endDate: new Date(start.getTime() + 30 * 60000),
          status: 'COMPLETED',
          pricePaidCents: 4000,
          paymentMethod: 'PIX',
        }),
      ),
    );

    const dashboard = await makeDashboard().execute('barbershop-no-wh');

    expect(dashboard.occupancy.week?.rate).toBeNull();
    expect(dashboard.occupancy.week?.occupiedMinutes).toBe(30);
    expect(dashboard.occupancy.week?.availableMinutes).toBe(0);
  });

  it('desconta dias fechados da capacidade disponível', async () => {
    await workingHoursRepository.save(
      new WorkingHours({
        id: 'wh-closed',
        barbershopId: BARBERSHOP_ID,
        dayOfWeek: 0,
        isOpen: false,
        openTime: '09:00',
        closeTime: '19:00',
      }),
    );

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    expect(dashboard.occupancy.week?.availableMinutes).toBe(3600);
  });

  it('quebra o faturamento por método de pagamento', async () => {
    await seedCompletedAppointment('p1', atWeekDay(0), 4000, 'PIX');
    await seedCompletedAppointment('p2', atWeekDay(1), 5000, 'DEBIT');
    await seedCompletedAppointment('p3', atWeekDay(2), 3000, 'CASH');
    await seedCompletedAppointment('p4', atWeekDay(3), 7000, 'CREDIT');
    await seedCompletedAppointment('p5', daysFromToday(-40), 9000, 'PIX');

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    expect(dashboard.paymentMethods.week.pixCents).toBe(4000);
    expect(dashboard.paymentMethods.week.debitCents).toBe(5000);
    expect(dashboard.paymentMethods.week.creditCents).toBe(7000);
    expect(dashboard.paymentMethods.week.cashCents).toBe(3000);
    expect(dashboard.paymentMethods.week.count).toBe(4);

    const a5InThisMonth = new Date(daysFromToday(-40)).getMonth() === new Date().getMonth();
    const monthPix = a5InThisMonth ? 13000 : 4000;
    expect(dashboard.paymentMethods.month.pixCents).toBe(monthPix);
    expect(dashboard.paymentMethods.month.debitCents).toBe(5000);
    expect(dashboard.paymentMethods.month.creditCents).toBe(7000);
    expect(dashboard.paymentMethods.month.cashCents).toBe(3000);
  });

  it('quebra o faturamento por serviço', async () => {
    await serviceRepository.save(
      new Service(
        makeServiceProps({
          id: 'service-2',
          barbershopId: BARBERSHOP_ID,
          name: 'Barba',
          priceCents: 3000,
        }),
      ),
    );

    await seedCompletedAppointment('s1', atWeekDay(0), 4000, 'PIX', SERVICE_ID);
    await seedCompletedAppointment('s2', atWeekDay(1), 3000, 'PIX', 'service-2');
    await seedCompletedAppointment('s3', atWeekDay(2), 4000, 'PIX', SERVICE_ID);

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    expect(dashboard.revenueByService.week).toHaveLength(2);
    expect(dashboard.revenueByService.week[0]).toMatchObject({
      serviceId: SERVICE_ID,
      serviceName: expect.any(String),
      cents: 8000,
      count: 2,
    });
    expect(dashboard.revenueByService.week[1]).toMatchObject({
      serviceId: 'service-2',
      serviceName: 'Barba',
      cents: 3000,
      count: 1,
    });
  });

  it('calcula comissões a repassar e por barbeiro', async () => {
    await commissionRepository.save(
      new Commission({
        id: 'c1',
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        appointmentId: null,
        serviceValueCents: 5000,
        commissionCents: 750,
        rate: 15,
      }),
    );
    await commissionRepository.save(
      new Commission({
        id: 'c2',
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        appointmentId: null,
        serviceValueCents: 5000,
        commissionCents: 750,
        rate: 15,
        isPaid: true,
      }),
    );

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    expect(dashboard.commission.weekTotalCents).toBe(1500);
    expect(dashboard.commission.payableWeekCents).toBe(750);
    expect(dashboard.commission.payableMonthCents).toBe(750);
    expect(dashboard.commission.byBarber).toHaveLength(1);
    expect(dashboard.commission.byBarber[0]).toMatchObject({
      barberId: BARBER_ID,
      barberName: 'Barbeiro Um',
      commissionCents: 1500,
      payableCents: 750,
      count: 2,
    });
  });

  it('calcula ticket médio e caixa', async () => {
    await seedCompletedAppointment('t1', atWeekDay(0), 4000);
    await seedCompletedAppointment('t2', atWeekDay(1), 6000);

    await appointmentRepository.save(
      new Appointment(
        makeAppointmentProps({
          id: 't3',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
          startDate: atWeekDay(3),
          endDate: new Date(atWeekDay(3).getTime() + 30 * 60000),
          status: 'SCHEDULED',
        }),
      ),
    );

    const dashboard = await makeDashboard().execute(BARBERSHOP_ID);

    expect(dashboard.ticketAverageCents.week).toBe(5000);
    expect(dashboard.ticketAverageCents.month).toBe(5000);
    expect(dashboard.cash.balanceCents).toBe(10000);
    expect(dashboard.cash.projectedMonthCents).toBe(10000 + 4000);
  });
});
