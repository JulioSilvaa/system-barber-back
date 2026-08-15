import { beforeEach, describe, expect, it } from 'vitest';
import GetWorkingHoursUseCase, {
  DEFAULT_WORKING_HOURS,
} from '@/application/useCases/workingHours/Get';
import { WorkingHours } from '@/domain/entities/WorkingHours';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';

function makeHours(props: {
  id: string;
  barbershopId: string;
  barberId?: string | null;
  dayOfWeek: number;
  isOpen?: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}) {
  return new WorkingHours(props);
}

describe('GetWorkingHoursUseCase', () => {
  let repository: WorkingHoursRepositoryMemory;
  let useCase: GetWorkingHoursUseCase;

  beforeEach(() => {
    repository = new WorkingHoursRepositoryMemory();
    useCase = new GetWorkingHoursUseCase(repository);
  });

  it('retorna horários individuais quando o barbeiro possui horário próprio', async () => {
    await repository.save(
      makeHours({
        id: 'h1',
        barbershopId: 'shop-1',
        barberId: 'barber-a',
        dayOfWeek: 1,
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
      }),
    );
    await repository.save(
      makeHours({
        id: 'h2',
        barbershopId: 'shop-1',
        barberId: 'barber-b',
        dayOfWeek: 1,
        isOpen: true,
        openTime: '10:00',
        closeTime: '18:00',
      }),
    );

    const hours = await useCase.execute('shop-1', 'barber-a');

    expect(hours).toHaveLength(1);
    expect(hours[0]).toEqual(
      expect.objectContaining({ barberId: 'barber-a', openTime: '09:00', closeTime: '17:00' }),
    );
  });

  it('não cai para o expediente da barbearia quando o barbeiro não tem horário próprio', async () => {
    await repository.save(
      makeHours({
        id: 'shop-h1',
        barbershopId: 'shop-1',
        dayOfWeek: 1,
        isOpen: true,
        openTime: '09:00',
        closeTime: '19:00',
      }),
    );
    await repository.save(
      makeHours({
        id: 'shop-h2',
        barbershopId: 'shop-1',
        dayOfWeek: 2,
        isOpen: true,
        openTime: '09:00',
        closeTime: '19:00',
      }),
    );

    const hours = await useCase.execute('shop-1', 'barber-a');

    expect(hours).toEqual([]);
  });

  it('retorna horários de outro barbeiro não afeta o barbeiro consultado', async () => {
    await repository.save(
      makeHours({
        id: 'h1',
        barbershopId: 'shop-1',
        barberId: 'barber-b',
        dayOfWeek: 1,
        isOpen: true,
        openTime: '10:00',
        closeTime: '18:00',
      }),
    );

    const hours = await useCase.execute('shop-1', 'barber-a');

    expect(hours).toEqual([]);
  });

  it('sem barberId retorna os horários da barbearia', async () => {
    await repository.save(
      makeHours({
        id: 'shop-h1',
        barbershopId: 'shop-1',
        dayOfWeek: 1,
        isOpen: true,
        openTime: '09:00',
        closeTime: '19:00',
      }),
    );

    const hours = await useCase.execute('shop-1');

    expect(hours).toHaveLength(1);
    expect(hours[0]).toEqual(expect.objectContaining({ barberId: null, openTime: '09:00' }));
  });

  it('sem barberId e sem horários retorna os horários padrão', async () => {
    const hours = await useCase.execute('shop-1');

    expect(hours).toHaveLength(7);
    expect(hours[0]).toEqual(expect.objectContaining({ dayOfWeek: 0, isOpen: false }));
    expect(hours[0].id).toBe('default-0-shop-1');
    expect(hours.map(h => h.dayOfWeek)).toEqual(DEFAULT_WORKING_HOURS.map(day => day.dayOfWeek));
  });
});
