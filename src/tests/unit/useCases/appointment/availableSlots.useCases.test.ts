import { beforeEach, describe, expect, it } from 'vitest';
import GetAvailableSlotsUseCase from '@/application/useCases/appointment/GetAvailableSlots';
import { Appointment } from '@/domain/entities/Appointment';
import { Service } from '@/domain/entities/Service';
import { WorkingHours } from '@/domain/entities/WorkingHours';
import { makeAppointmentProps, makeServiceProps } from '@/tests/helpers/factories';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';

describe('GetAvailableSlotsUseCase', () => {
  const BARBERSHOP_ID = 'barbershop-1';
  const BARBER_A = 'barber-a';
  const BARBER_B = 'barber-b';
  const SERVICE_ID = 'service-1';

  let appointmentRepository: AppointmentRepositoryMemory;
  let serviceRepository: ServiceRepositoryMemory;
  let workingHoursRepository: WorkingHoursRepositoryMemory;
  let useCase: GetAvailableSlotsUseCase;

  function nextWednesday(): Date {
    const date = new Date();
    date.setDate(date.getDate() + ((3 - date.getDay() + 7) % 7 || 7));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  beforeEach(async () => {
    appointmentRepository = new AppointmentRepositoryMemory();
    serviceRepository = new ServiceRepositoryMemory();
    workingHoursRepository = new WorkingHoursRepositoryMemory();
    useCase = new GetAvailableSlotsUseCase(
      appointmentRepository,
      serviceRepository,
      workingHoursRepository,
    );

    await serviceRepository.save(
      new Service(
        makeServiceProps({
          id: SERVICE_ID,
          barbershopId: BARBERSHOP_ID,
          durationMinutes: 30,
        }),
      ),
    );

    for (let day = 0; day < 7; day++) {
      await workingHoursRepository.save(
        new WorkingHours({
          id: `wh-${day}`,
          barbershopId: BARBERSHOP_ID,
          dayOfWeek: day,
          isOpen: true,
          openTime: '09:00',
          closeTime: '17:00',
        }),
      );
    }
  });

  async function seedAppointment(barberId: string, startDate: Date, durationMinutes = 30) {
    const appointment = new Appointment(
      makeAppointmentProps({
        id: `appt-${startDate.getTime()}-${barberId}`,
        barbershopId: BARBERSHOP_ID,
        barberId,
        serviceId: SERVICE_ID,
        startDate,
        endDate: new Date(startDate.getTime() + durationMinutes * 60000),
        status: 'SCHEDULED',
      }),
    );
    await appointmentRepository.save(appointment);
  }

  it('gera slots dentro do expediente respeitando a duração do serviço', async () => {
    const date = nextWednesday();
    const slots = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      date,
      serviceId: SERVICE_ID,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].time).toBe('09:00');
    expect(slots[slots.length - 1].time).toBe('16:30');
    for (const slot of slots) {
      const [hh, mm] = slot.time.split(':').map(Number);
      expect(hh * 60 + mm + 30).toBeLessThanOrEqual(17 * 60);
    }
  });

  it('remove horários do passado quando a data é hoje', async () => {
    const now = new Date();
    const slots = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      date: now,
      serviceId: SERVICE_ID,
    });

    for (const slot of slots) {
      expect(slot.startDate.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('bloqueia slots que conflitam com agendamento do mesmo barbeiro', async () => {
    const date = nextWednesday();
    await seedAppointment(
      BARBER_A,
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0),
      60,
    );

    const slots = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      date,
      serviceId: SERVICE_ID,
      barberId: BARBER_A,
    });

    expect(slots.some(slot => slot.time === '10:00')).toBe(false);
    expect(slots.some(slot => slot.time === '10:30')).toBe(false);
    expect(slots.some(slot => slot.time === '09:00')).toBe(true);
    expect(slots.some(slot => slot.time === '11:00')).toBe(true);
  });

  it('não bloqueia slots de outro barbeiro', async () => {
    const date = nextWednesday();
    await seedAppointment(
      BARBER_A,
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0),
    );

    const slots = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      date,
      serviceId: SERVICE_ID,
      barberId: BARBER_B,
    });

    expect(slots.some(slot => slot.time === '10:00')).toBe(true);
  });

  it('retorna lista vazia quando o dia está fechado', async () => {
    const date = nextWednesday();
    await workingHoursRepository.save(
      new WorkingHours({
        id: `wh-closed`,
        barbershopId: BARBERSHOP_ID,
        dayOfWeek: date.getDay(),
        isOpen: false,
      }),
    );

    const slots = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      date,
      serviceId: SERVICE_ID,
    });
    expect(slots).toEqual([]);
  });
});
