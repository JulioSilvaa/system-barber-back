import { beforeEach, describe, expect, it } from 'vitest';
import CreateAppointmentUseCase from '@/application/useCases/appointment/Create';
import CompleteAppointmentUseCase from '@/application/useCases/appointment/Complete';
import CancelAppointmentUseCase from '@/application/useCases/appointment/Cancel';
import ListDayAppointmentsUseCase from '@/application/useCases/appointment/ListDay';
import { Appointment } from '@/domain/entities/Appointment';
import { Service } from '@/domain/entities/Service';
import { Barbershop } from '@/domain/entities/Barbershop';
import { UserBarbershop } from '@/domain/entities';
import { makeAppointmentProps } from '@/tests/helpers/factories';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

describe('Appointment Use Cases Unit Tests', () => {
  let appointmentRepository: AppointmentRepositoryMemory;
  let serviceRepository: ServiceRepositoryMemory;
  let barbershopRepository: BarbershopRepositoryMemory;
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let customerRepository: CustomerRepositoryMemory;

  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const BARBER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
  const SERVICE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d481';

  const inputMock = {
    barbershopId: BARBERSHOP_ID,
    barberId: BARBER_ID,
    serviceId: SERVICE_ID,
    customerName: 'Maria Souza',
    customerPhone: '16988888888',
    startDate: new Date('2026-08-10T14:00:00.000Z'),
  };

  const makeCreateUseCase = () =>
    new CreateAppointmentUseCase(
      appointmentRepository,
      barbershopRepository,
      serviceRepository,
      userBarbershopRepository,
      customerRepository,
    );

  beforeEach(async () => {
    appointmentRepository = new AppointmentRepositoryMemory();
    serviceRepository = new ServiceRepositoryMemory();
    barbershopRepository = new BarbershopRepositoryMemory();
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    customerRepository = new CustomerRepositoryMemory();

    await barbershopRepository.save(
      new Barbershop({
        id: BARBERSHOP_ID,
        name: 'Barbearia Central',
        slug: 'barbearia-central',
        email: 'contato@barbeariacentral.com',
        phone: '+5516999999999',
        password: 'SenhaForte1',
      }),
    );

    await serviceRepository.save(
      new Service({
        id: SERVICE_ID,
        barbershopId: BARBERSHOP_ID,
        name: 'Corte de cabelo',
        priceCents: 4000,
        durationMinutes: 30,
      }),
    );

    await userBarbershopRepository.save(
      new UserBarbershop({
        id: 'membership-1',
        userId: BARBER_ID,
        barbershopId: BARBERSHOP_ID,
        localRole: 'BARBER',
      }),
    );
  });

  describe('CreateAppointmentUseCase', () => {
    it('deve criar e salvar um agendamento com endDate calculado pela duração do serviço', async () => {
      const output = await makeCreateUseCase().execute(inputMock);

      expect(output).toEqual(
        expect.objectContaining({
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
          customerId: expect.any(String),
          status: 'SCHEDULED',
          startDate: inputMock.startDate,
          endDate: new Date('2026-08-10T14:30:00.000Z'),
        }),
      );
    });

    it('deve criar um cliente novo quando o telefone ainda não existe na barbearia', async () => {
      const output = await makeCreateUseCase().execute(inputMock);

      const customer = await customerRepository.findByBarbershopAndPhone(
        BARBERSHOP_ID,
        '16988888888',
      );

      expect(customer).toBeTruthy();
      expect(customer?.name).toBe('Maria Souza');
      expect(output.customerId).toBe(customer?.id);
    });

    it('deve reutilizar o cliente existente com o mesmo telefone na mesma barbearia', async () => {
      const first = await makeCreateUseCase().execute(inputMock);
      const second = await makeCreateUseCase().execute({
        ...inputMock,
        startDate: new Date('2026-08-10T15:00:00.000Z'),
      });

      expect(second.customerId).toBe(first.customerId);
      expect(await customerRepository.findByBarbershop(BARBERSHOP_ID)).toHaveLength(1);
    });

    it('deve lançar erro quando o cliente não é informado', async () => {
      await expect(makeCreateUseCase().execute({ ...inputMock, customerName: '' })).rejects.toThrow(
        'Nome do cliente é obrigatório',
      );
    });

    it('deve lançar erro quando o barbeiro não tem vínculo ativo', async () => {
      await expect(
        makeCreateUseCase().execute({ ...inputMock, barberId: 'barbeiro-sem-vinculo' }),
      ).rejects.toThrow('Barbeiro não encontrado');
    });

    it('deve lançar erro quando o serviço não pertence à barbearia', async () => {
      await expect(
        makeCreateUseCase().execute({ ...inputMock, serviceId: 'servico-inexistente' }),
      ).rejects.toThrow('Serviço não encontrado');
    });

    it('deve lançar erro quando já existe agendamento no mesmo horário', async () => {
      await makeCreateUseCase().execute(inputMock);

      await expect(
        makeCreateUseCase().execute({
          ...inputMock,
          startDate: new Date('2026-08-10T14:15:00.000Z'),
        }),
      ).rejects.toThrow('Já existe um agendamento neste horário');
    });
  });

  describe('CompleteAppointmentUseCase', () => {
    it('deve concluir um agendamento', async () => {
      const appointment = new Appointment(
        makeAppointmentProps({
          id: 'appointment-1',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
        }),
      );
      await appointmentRepository.save(appointment);

      const useCase = new CompleteAppointmentUseCase(appointmentRepository);
      const output = await useCase.execute('appointment-1', BARBERSHOP_ID);

      expect(output.status).toBe('COMPLETED');
    });

    it('deve lançar erro quando o agendamento não existe', async () => {
      const useCase = new CompleteAppointmentUseCase(appointmentRepository);

      await expect(useCase.execute('inexistente', BARBERSHOP_ID)).rejects.toThrow(
        'Agendamento não encontrado',
      );
    });

    it('deve lançar erro ao concluir um agendamento cancelado', async () => {
      const appointment = new Appointment(
        makeAppointmentProps({
          id: 'appointment-1',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
          status: 'CANCELLED',
        }),
      );
      await appointmentRepository.save(appointment);

      const useCase = new CompleteAppointmentUseCase(appointmentRepository);

      await expect(useCase.execute('appointment-1', BARBERSHOP_ID)).rejects.toThrow(
        'appointment canceled',
      );
    });
  });

  describe('CancelAppointmentUseCase', () => {
    it('deve cancelar um agendamento', async () => {
      const appointment = new Appointment(
        makeAppointmentProps({
          id: 'appointment-1',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
        }),
      );
      await appointmentRepository.save(appointment);

      const useCase = new CancelAppointmentUseCase(appointmentRepository);
      const output = await useCase.execute('appointment-1', BARBERSHOP_ID);

      expect(output.status).toBe('CANCELLED');
    });

    it('deve lançar erro ao cancelar um agendamento concluído', async () => {
      const appointment = new Appointment(
        makeAppointmentProps({
          id: 'appointment-1',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          serviceId: SERVICE_ID,
          status: 'COMPLETED',
        }),
      );
      await appointmentRepository.save(appointment);

      const useCase = new CancelAppointmentUseCase(appointmentRepository);

      await expect(useCase.execute('appointment-1', BARBERSHOP_ID)).rejects.toThrow(
        'appointment already completed',
      );
    });
  });

  describe('ListDayAppointmentsUseCase', () => {
    it('deve listar apenas os agendamentos do dia', async () => {
      const useCase = new ListDayAppointmentsUseCase(appointmentRepository);

      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-1',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
            startDate: new Date('2026-08-10T14:00:00.000Z'),
            endDate: new Date('2026-08-10T14:30:00.000Z'),
          }),
        ),
      );
      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-2',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
            startDate: new Date('2026-08-11T14:00:00.000Z'),
            endDate: new Date('2026-08-11T14:30:00.000Z'),
          }),
        ),
      );

      const appointments = await useCase.execute(BARBERSHOP_ID, new Date(2026, 7, 10));

      expect(appointments).toHaveLength(1);
      expect(appointments[0].id).toBe('appointment-1');
    });
  });
});
