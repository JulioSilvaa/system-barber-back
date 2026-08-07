import { describe, expect, it } from 'vitest';
import { Appointment } from '@/domain/entities/Appointment';
import { makeAppointmentProps } from '@/tests/helpers/factories';

describe('Appointment Entity', () => {
  describe('Criação', () => {
    it('deve criar um agendamento válido', () => {
      const appointment = new Appointment(makeAppointmentProps());

      expect(appointment).toBeInstanceOf(Appointment);
      expect(appointment.id).toBe('appointment-1');
      expect(appointment.barbershopId).toBe('barbershop-1');
      expect(appointment.barberId).toBe('user-2');
      expect(appointment.serviceId).toBe('service-1');
      expect(appointment.customerId).toBe('customer-1');
      expect(appointment.status).toBe('SCHEDULED');
    });

    it('deve definir SCHEDULED como status padrão', () => {
      const appointment = new Appointment(makeAppointmentProps({ status: undefined }));

      expect(appointment.status).toBe('SCHEDULED');
    });
  });

  describe('Validação de datas (RN-02 e RN-03)', () => {
    it('deve rejeitar endDate anterior a startDate', () => {
      expect(
        () =>
          new Appointment(
            makeAppointmentProps({
              startDate: new Date('2026-08-05T15:00:00.000Z'),
              endDate: new Date('2026-08-05T14:30:00.000Z'),
            }),
          ),
      ).toThrow('end date must be greater than start date');
    });

    it('deve rejeitar endDate igual a startDate', () => {
      expect(
        () =>
          new Appointment(
            makeAppointmentProps({
              endDate: new Date('2026-08-05T14:00:00.000Z'),
            }),
          ),
      ).toThrow('end date must be greater than start date');
    });
  });

  describe('Detecção de conflito de horário (RN-03)', () => {
    it('deve detectar sobreposição quando um agendamento começa durante o outro', () => {
      const first = new Appointment(makeAppointmentProps());
      const overlapping = new Appointment(
        makeAppointmentProps({
          id: 'appointment-2',
          startDate: new Date('2026-08-05T14:15:00.000Z'),
          endDate: new Date('2026-08-05T14:45:00.000Z'),
        }),
      );

      expect(first.isOverlappingWith(overlapping)).toBe(true);
      expect(overlapping.isOverlappingWith(first)).toBe(true);
    });

    it('deve considerar que agendamentos adjacentes não se sobrepõem', () => {
      const first = new Appointment(makeAppointmentProps());
      const adjacent = new Appointment(
        makeAppointmentProps({
          id: 'appointment-2',
          startDate: new Date('2026-08-05T14:30:00.000Z'),
          endDate: new Date('2026-08-05T15:00:00.000Z'),
        }),
      );

      expect(first.isOverlappingWith(adjacent)).toBe(false);
    });

    it('deve considerar que agendamentos distantes não se sobrepõem', () => {
      const first = new Appointment(makeAppointmentProps());
      const distant = new Appointment(
        makeAppointmentProps({
          id: 'appointment-2',
          startDate: new Date('2026-08-05T16:00:00.000Z'),
          endDate: new Date('2026-08-05T16:30:00.000Z'),
        }),
      );

      expect(first.isOverlappingWith(distant)).toBe(false);
    });
  });

  describe('Transições de status', () => {
    it('deve concluir um agendamento SCHEDULED', () => {
      const appointment = new Appointment(makeAppointmentProps());

      appointment.complete();

      expect(appointment.status).toBe('COMPLETED');
    });

    it('deve cancelar um agendamento SCHEDULED', () => {
      const appointment = new Appointment(makeAppointmentProps());

      appointment.cancel();

      expect(appointment.status).toBe('CANCELLED');
    });

    it('deve lançar erro ao concluir um agendamento cancelado', () => {
      const appointment = new Appointment(makeAppointmentProps({ status: 'CANCELLED' }));

      expect(() => appointment.complete()).toThrow('appointment canceled');
    });

    it('deve lançar erro ao cancelar um agendamento concluído', () => {
      const appointment = new Appointment(makeAppointmentProps({ status: 'COMPLETED' }));

      expect(() => appointment.cancel()).toThrow('appointment already completed');
    });
  });
});
