import { beforeEach, describe, expect, it } from 'vitest';
import GetFinancialDashboardUseCase from '@/application/useCases/finance/GetFinancialDashboard';
import { Appointment } from '@/domain/entities/Appointment';
import { Commission } from '@/domain/entities';
import { UserBarbershop } from '@/domain/entities';
import { WorkingHours } from '@/domain/entities/WorkingHours';
import { makeAppointmentProps } from '@/tests/helpers/factories';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import { Service } from '@/domain/entities/Service';
import { makeServiceProps } from '@/tests/helpers/factories';

function daysFromToday(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

describe('GetFinancialDashboardUseCase', () => {
  let appointmentRepository: AppointmentRepositoryMemory;
  let commissionRepository: CommissionRepositoryMemory;
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let workingHoursRepository: WorkingHoursRepositoryMemory;
  let serviceRepository: ServiceRepositoryMemory;

  const BARBERSHOP_ID = 'barbershop-1';
  const BARBER_ID = 'barber-1';
  const SERVICE_ID = 'service-1';

  beforeEach(async () => {
    appointmentRepository = new AppointmentRepositoryMemory();
    commissionRepository = new CommissionRepositoryMemory();
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    workingHoursRepository = new WorkingHoursRepositoryMemory();
    serviceRepository = new ServiceRepositoryMemory();

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

  async function seedCompletedAppointment(id: string, startDate: Date, priceCents: number) {
    const appointment = new Appointment(
      makeAppointmentProps({
        id,
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        serviceId: SERVICE_ID,
        startDate,
        endDate: new Date(startDate.getTime() + 30 * 60000),
        status: 'COMPLETED',
        pricePaidCents: priceCents,
        paymentMethod: 'PIX',
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

    const dashboard = await new GetFinancialDashboardUseCase(
      appointmentRepository,
      commissionRepository,
      userBarbershopRepository,
      workingHoursRepository,
      serviceRepository,
    ).execute(BARBERSHOP_ID);

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

    const dashboard = await new GetFinancialDashboardUseCase(
      appointmentRepository,
      commissionRepository,
      userBarbershopRepository,
      workingHoursRepository,
      serviceRepository,
    ).execute(BARBERSHOP_ID);

    expect(dashboard.commission.weekTotalCents).toBe(750);
    expect(dashboard.commission.monthTotalCents).toBe(750);
  });

  it('calcula taxa de ocupação usando horário de funcionamento e barbeiros ativos', async () => {
    await seedCompletedAppointment('b1', daysFromToday(0), 4000);
    await seedCompletedAppointment('b2', daysFromToday(1), 4000);

    const dashboard = await new GetFinancialDashboardUseCase(
      appointmentRepository,
      commissionRepository,
      userBarbershopRepository,
      workingHoursRepository,
      serviceRepository,
    ).execute(BARBERSHOP_ID);

    const week = dashboard.occupancy.week;
    expect(week).not.toBeNull();
    expect(week?.occupiedMinutes).toBe(60);
    // 7 dias x 600 min x 1 barbeiro
    expect(week?.availableMinutes).toBe(4200);
    expect(week?.rate).toBe(1);
  });
});
