import { beforeEach, describe, expect, it } from 'vitest';
import CreateAppointmentUseCase from '@/application/useCases/appointment/Create';
import CompleteAppointmentUseCase from '@/application/useCases/appointment/Complete';
import CancelAppointmentUseCase from '@/application/useCases/appointment/Cancel';
import ConfirmAppointmentUseCase from '@/application/useCases/appointment/Confirm';
import ListInactiveClientsUseCase from '@/application/useCases/appointment/ListInactiveClients';
import ListDayAppointmentsUseCase from '@/application/useCases/appointment/ListDay';
import { Appointment } from '@/domain/entities/Appointment';
import { Customer } from '@/domain/entities/Customer';
import { Service } from '@/domain/entities/Service';
import { Barbershop } from '@/domain/entities/Barbershop';
import { UserBarbershop } from '@/domain/entities';
import { WorkingHours } from '@/domain/entities/WorkingHours';
import { makeAppointmentProps, futureDate } from '@/tests/helpers/factories';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import CommissionRepositoryMemory from '@/infra/repositories/inMemory/commission/commissionRepositoryMemory';
import WorkingHoursRepositoryMemory from '@/infra/repositories/inMemory/workingHours/workingHoursRepositoryMemory';

describe('Appointment Use Cases Unit Tests', () => {
  let appointmentRepository: AppointmentRepositoryMemory;
  let serviceRepository: ServiceRepositoryMemory;
  let barbershopRepository: BarbershopRepositoryMemory;
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let customerRepository: CustomerRepositoryMemory;
  let commissionRepository: CommissionRepositoryMemory;

  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const BARBER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
  const SERVICE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d481';

  const START_DATE = futureDate(1, 14);

  const inputMock = {
    barbershopId: BARBERSHOP_ID,
    barberId: BARBER_ID,
    serviceId: SERVICE_ID,
    customerName: 'Maria Souza',
    customerPhone: '16988888888',
    startDate: START_DATE,
  };

  const makeCreateUseCase = (workingHoursRepository?: WorkingHoursRepositoryMemory) =>
    new CreateAppointmentUseCase(
      appointmentRepository,
      barbershopRepository,
      serviceRepository,
      userBarbershopRepository,
      customerRepository,
      workingHoursRepository ?? new WorkingHoursRepositoryMemory(),
    );

  beforeEach(async () => {
    appointmentRepository = new AppointmentRepositoryMemory();
    serviceRepository = new ServiceRepositoryMemory();
    barbershopRepository = new BarbershopRepositoryMemory();
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    customerRepository = new CustomerRepositoryMemory();
    commissionRepository = new CommissionRepositoryMemory();

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
          endDate: new Date(inputMock.startDate.getTime() + 30 * 60 * 1000),
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
        startDate: futureDate(1, 15),
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
          startDate: new Date(START_DATE.getTime() + 15 * 60 * 1000),
        }),
      ).rejects.toThrow('Já existe um agendamento neste horário');
    });
  });

  describe('CompleteAppointmentUseCase', () => {
    const makeCompleteUseCase = () =>
      new CompleteAppointmentUseCase(
        appointmentRepository,
        serviceRepository,
        userBarbershopRepository,
        commissionRepository,
      );

    it('deve concluir um agendamento salvando a nota informada', async () => {
      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-1',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
          }),
        ),
      );

      const input: Parameters<CompleteAppointmentUseCase['execute']>[0] = {
        appointmentId: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
        paidPriceCents: 5800,
        paymentMethod: 'PIX',
        note: 'Corte + pomada',
      };

      const output = await makeCompleteUseCase().execute(input);

      expect(output.status).toBe('COMPLETED');
      expect(output.pricePaidCents).toBe(5800);
      expect(output.paymentMethod).toBe('PIX');
      expect(output.note).toBe('Corte + pomada');
    });

    it('deve concluir um agendamento cobrando o valor informado', async () => {
      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-1',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
          }),
        ),
      );

      const output = await makeCompleteUseCase().execute({
        appointmentId: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
        paidPriceCents: 4500,
        paymentMethod: 'PIX',
      });

      expect(output.status).toBe('COMPLETED');
      expect(output.pricePaidCents).toBe(4500);
      expect(output.paymentMethod).toBe('PIX');
    });

    it('deve usar o preço do serviço e método CASH quando nada é informado', async () => {
      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-1',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
          }),
        ),
      );

      const output = await makeCompleteUseCase().execute({
        appointmentId: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
      });

      expect(output.pricePaidCents).toBe(4000);
      expect(output.paymentMethod).toBe('CASH');
    });

    it('deve gerar comissão do barbeiro', async () => {
      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-1',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
          }),
        ),
      );
      const membership = await userBarbershopRepository.findByUserAndBarbershop(
        BARBER_ID,
        BARBERSHOP_ID,
      );
      membership?.setCommissionRate(10);
      if (membership) await userBarbershopRepository.save(membership);

      const output = await makeCompleteUseCase().execute({
        appointmentId: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
        paidPriceCents: 5000,
        paymentMethod: 'CASH',
      });

      const commission = await commissionRepository.findByAppointment('appointment-1', BARBERSHOP_ID);
      expect(commission).toMatchObject({
        commissionCents: 500,
        rate: 10,
        appointmentId: output.id,
      });
    });

    it('deve lançar erro quando o agendamento não existe', async () => {
      const useCase = makeCompleteUseCase();

      await expect(
        useCase.execute({
          appointmentId: 'inexistente',
          barbershopId: BARBERSHOP_ID,
        }),
      ).rejects.toThrow('Agendamento não encontrado');
    });

    it('deve lançar erro ao concluir um agendamento cancelado', async () => {
      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-1',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
            status: 'CANCELLED',
          }),
        ),
      );

      const useCase = makeCompleteUseCase();

      await expect(
        useCase.execute({
          appointmentId: 'appointment-1',
          barbershopId: BARBERSHOP_ID,
        }),
      ).rejects.toThrow('appointment canceled');
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

  describe('ConfirmAppointmentUseCase', () => {
    const makeConfirmUseCase = () => new ConfirmAppointmentUseCase(appointmentRepository);

    const saveAppointment = (props: Parameters<typeof makeAppointmentProps>[0]) =>
      appointmentRepository.save(new Appointment(makeAppointmentProps(props)));

    it('deve confirmar um agendamento agendado', async () => {
      await saveAppointment({
        id: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        serviceId: SERVICE_ID,
      });

      const output = await makeConfirmUseCase().execute('appointment-1', BARBERSHOP_ID);

      expect(output.status).toBe('CONFIRMED');
    });

    it('deve ser idempotente ao confirmar um agendamento já confirmado', async () => {
      await saveAppointment({
        id: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        serviceId: SERVICE_ID,
        status: 'CONFIRMED',
      });

      const output = await makeConfirmUseCase().execute('appointment-1', BARBERSHOP_ID);

      expect(output.status).toBe('CONFIRMED');
    });

    it('deve lançar erro ao confirmar um agendamento cancelado', async () => {
      await saveAppointment({
        id: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        serviceId: SERVICE_ID,
        status: 'CANCELLED',
      });

      await expect(makeConfirmUseCase().execute('appointment-1', BARBERSHOP_ID)).rejects.toThrow(
        'appointment canceled',
      );
    });

    it('deve lançar erro ao confirmar um agendamento concluído', async () => {
      await saveAppointment({
        id: 'appointment-1',
        barbershopId: BARBERSHOP_ID,
        barberId: BARBER_ID,
        serviceId: SERVICE_ID,
        status: 'COMPLETED',
      });

      await expect(makeConfirmUseCase().execute('appointment-1', BARBERSHOP_ID)).rejects.toThrow(
        'appointment already completed',
      );
    });

    it('deve lançar erro quando o agendamento não existe', async () => {
      await expect(makeConfirmUseCase().execute('inexistente', BARBERSHOP_ID)).rejects.toThrow(
        'Agendamento não encontrado',
      );
    });
  });

  describe('ListInactiveClientsUseCase', () => {
    const NOW = new Date();
    NOW.setHours(12, 0, 0, 0);

    const makeUseCase = () =>
      new ListInactiveClientsUseCase(appointmentRepository, customerRepository, serviceRepository);

    const saveCustomer = (id: string, name: string, phone: string) =>
      customerRepository.save(
        new Customer({
          id,
          barbershopId: BARBERSHOP_ID,
          name,
          phone,
        }),
      );

    const saveCompleted = (
      id: string,
      customerId: string,
      startDate: Date,
      pricePaidCents: number,
    ) =>
      appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id,
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
            customerId,
            startDate,
            endDate: new Date(startDate.getTime() + 30 * 60 * 1000),
            status: 'COMPLETED',
            pricePaidCents,
            paymentMethod: 'PIX',
          }),
        ),
      );

    beforeEach(async () => {
      await serviceRepository.save(
        new Service({
          id: SERVICE_ID,
          barbershopId: BARBERSHOP_ID,
          name: 'Corte de cabelo',
          priceCents: 4000,
          durationMinutes: 30,
        }),
      );
    });

    it('deve listar clientes inativos com dados enriquecidos, ordenados pelo tempo sem visitar', async () => {
      await saveCustomer('customer-a', 'Pedro Henrique', '11987654321');
      await saveCustomer('customer-b', 'Carlos Alberto', '11912345678');
      await saveCustomer('customer-c', 'Rafael Souza', '11955554444');

      await saveCompleted(
        'appointment-a',
        'customer-a',
        new Date(NOW.getTime() - 56 * 24 * 60 * 60 * 1000),
        6000,
      );
      await saveCompleted(
        'appointment-b',
        'customer-b',
        new Date(NOW.getTime() - 46 * 24 * 60 * 60 * 1000),
        5000,
      );
      await saveCompleted(
        'appointment-c',
        'customer-c',
        new Date(NOW.getTime() - 38 * 24 * 60 * 60 * 1000),
        6000,
      );

      const result = await makeUseCase().execute(BARBERSHOP_ID, NOW);

      expect(result.map(client => client.id)).toEqual(['customer-a', 'customer-b', 'customer-c']);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'customer-a',
          name: 'Pedro Henrique',
          phone: '11987654321',
          lastVisitDays: 56,
          lastService: 'Corte de cabelo',
          estimatedLostValueCents: 6000,
        }),
      );
      expect(result[1].lastVisitDays).toBe(46);
      expect(result[2].lastVisitDays).toBe(38);
    });

    it('deve excluir clientes com agendamento futuro', async () => {
      await saveCustomer('customer-futuro', 'Quem Voltou', '11911112222');

      await saveCompleted(
        'appointment-old',
        'customer-futuro',
        new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000),
        4000,
      );
      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-future',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
            customerId: 'customer-futuro',
            startDate: futureDate(7, 14),
            endDate: futureDate(7, 14, 30),
            status: 'SCHEDULED',
          }),
        ),
      );

      const result = await makeUseCase().execute(BARBERSHOP_ID, NOW);

      expect(result).toHaveLength(0);
    });

    it('deve excluir clientes com atendimento recente', async () => {
      await saveCustomer('customer-recente', 'Cliente Recente', '11922223333');
      await saveCompleted(
        'appointment-recente',
        'customer-recente',
        new Date(NOW.getTime() - 19 * 24 * 60 * 60 * 1000),
        4000,
      );

      const result = await makeUseCase().execute(BARBERSHOP_ID, NOW);

      expect(result).toHaveLength(0);
    });

    it('deve calcular o ticket médio e sugerir ofertas conforme as regras', async () => {
      await saveCustomer('customer-premium', 'Cliente Premium', '11933334444');
      await saveCustomer('customer-60dias', 'Cliente Antigo', '11944445555');

      await saveCompleted(
        'appointment-premium',
        'customer-premium',
        new Date(NOW.getTime() - 41 * 24 * 60 * 60 * 1000),
        8500,
      );
      await saveCompleted(
        'appointment-60dias',
        'customer-60dias',
        new Date(NOW.getTime() - 106 * 24 * 60 * 60 * 1000),
        4000,
      );

      const result = await makeUseCase().execute(BARBERSHOP_ID, NOW);

      const premium = result.find(client => client.id === 'customer-premium');
      const antigo = result.find(client => client.id === 'customer-60dias');

      expect(premium).toEqual(
        expect.objectContaining({
          estimatedLostValueCents: 8500,
          suggestedOffer: 'Oferta de retorno com 15% de desconto no próximo corte',
        }),
      );
      expect(antigo).toEqual(
        expect.objectContaining({
          lastVisitDays: 106,
          suggestedOffer: 'Convite para uma visita expressa',
        }),
      );
    });
  });

  describe('ListDayAppointmentsUseCase', () => {
    it('deve listar apenas os agendamentos do dia', async () => {
      const useCase = new ListDayAppointmentsUseCase(appointmentRepository);

      const today = new Date();
      today.setHours(14, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await appointmentRepository.save(
        new Appointment(
          makeAppointmentProps({
            id: 'appointment-1',
            barbershopId: BARBERSHOP_ID,
            barberId: BARBER_ID,
            serviceId: SERVICE_ID,
            startDate: today,
            endDate: new Date(today.getTime() + 30 * 60 * 1000),
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
            startDate: tomorrow,
            endDate: new Date(tomorrow.getTime() + 30 * 60 * 1000),
          }),
        ),
      );

      const dayStart = new Date(today);
      dayStart.setHours(0, 0, 0, 0);
      const appointments = await useCase.execute(BARBERSHOP_ID, dayStart);

      expect(appointments).toHaveLength(1);
      expect(appointments[0].id).toBe('appointment-1');
    });
  });

  describe('CreateAppointmentUseCase - working hours', () => {
    const workingHoursRepository = new WorkingHoursRepositoryMemory();

    it('deve rejeitar agendamento quando o dia está fechado', async () => {
      const useCase = makeCreateUseCase(workingHoursRepository);
      const now = new Date();
      const date = new Date(now);
      date.setDate(now.getDate() + ((7 - now.getDay()) % 7) + 7);
      date.setHours(14, 0, 0, 0); // próximo domingo, no futuro

      await workingHoursRepository.save(
        new WorkingHours({
          id: 'wh-sun',
          barbershopId: BARBERSHOP_ID,
          dayOfWeek: date.getDay(),
          isOpen: false,
        }),
      );

      await expect(useCase.execute({ ...inputMock, startDate: date })).rejects.toThrow(
        'Barbearia fechada neste dia',
      );
    });

    it('deve rejeitar agendamento fora do expediente do barbeiro', async () => {
      const useCase = makeCreateUseCase(workingHoursRepository);
      const date = futureDate(2, 8); // 2 dias no futuro, 08:00 (antes das 09:00)

      await workingHoursRepository.save(
        new WorkingHours({
          id: 'wh-barber',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          dayOfWeek: date.getDay(),
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
        }),
      );

      await expect(useCase.execute({ ...inputMock, startDate: date })).rejects.toThrow(
        'Horário fora do expediente',
      );
    });

    it('deve aceitar agendamento dentro do expediente do barbeiro', async () => {
      const useCase = makeCreateUseCase(workingHoursRepository);
      const date = futureDate(3, 14); // 3 dias no futuro, 14:00 (dentro do horário)

      await workingHoursRepository.save(
        new WorkingHours({
          id: 'wh-barber-ok',
          barbershopId: BARBERSHOP_ID,
          barberId: BARBER_ID,
          dayOfWeek: date.getDay(),
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
        }),
      );

      await expect(useCase.execute({ ...inputMock, startDate: date })).resolves.toBeDefined();
    });
  });
});
