import { beforeEach, describe, expect, it } from 'vitest';
import CreateEvaluationUseCase, {
  GetEvaluationStatusUseCase,
} from '@/application/useCases/finance/CreateEvaluation';
import { Appointment } from '@/domain/entities/Appointment';
import { makeAppointmentProps } from '@/tests/helpers/factories';
import AppointmentRepositoryMemory from '@/infra/repositories/inMemory/appointment/appointmentRepositoryMemory';
import EvaluationRepositoryMemory from '@/infra/repositories/inMemory/evaluation/evaluationRepositoryMemory';

describe('Evaluation Use Cases', () => {
  let evaluationRepository: EvaluationRepositoryMemory;
  let appointmentRepository: AppointmentRepositoryMemory;

  const BARBERSHOP_ID = 'barbershop-1';
  const SERVICE_ID = 'service-1';

  beforeEach(async () => {
    evaluationRepository = new EvaluationRepositoryMemory();
    appointmentRepository = new AppointmentRepositoryMemory();
  });

  async function seedAppointment(status: 'SCHEDULED' | 'COMPLETED' = 'COMPLETED') {
    await appointmentRepository.save(
      new Appointment(
        makeAppointmentProps({
          id: 'appointment-1',
          barbershopId: BARBERSHOP_ID,
          serviceId: SERVICE_ID,
          status,
        }),
      ),
    );
  }

  describe('CreateEvaluationUseCase', () => {
    it('cria avaliação para atendimento concluído', async () => {
      await seedAppointment();
      const useCase = new CreateEvaluationUseCase(evaluationRepository, appointmentRepository);

      const evaluation = await useCase.execute({
        barbershopId: BARBERSHOP_ID,
        appointmentId: 'appointment-1',
        rating: 5,
        comment: 'Excelente corte!',
      });

      expect(evaluation).toMatchObject({
        appointmentId: 'appointment-1',
        rating: 5,
        comment: 'Excelente corte!',
      });
    });

    it('rejeita avaliação de atendimento não concluído', async () => {
      await seedAppointment('SCHEDULED');
      const useCase = new CreateEvaluationUseCase(evaluationRepository, appointmentRepository);

      await expect(
        useCase.execute({
          barbershopId: BARBERSHOP_ID,
          appointmentId: 'appointment-1',
          rating: 3,
        }),
      ).rejects.toThrow('Apenas atendimentos concluídos podem ser avaliados');
    });

    it('rejeita nota fora de 1-5', async () => {
      await seedAppointment();
      const useCase = new CreateEvaluationUseCase(evaluationRepository, appointmentRepository);

      await expect(
        useCase.execute({
          barbershopId: BARBERSHOP_ID,
          appointmentId: 'appointment-1',
          rating: 6,
        }),
      ).rejects.toThrow('A avaliação deve ser uma nota entre 1 e 5');
    });

    it('rejeita avaliação duplicada', async () => {
      await seedAppointment();
      const useCase = new CreateEvaluationUseCase(evaluationRepository, appointmentRepository);
      await useCase.execute({
        barbershopId: BARBERSHOP_ID,
        appointmentId: 'appointment-1',
        rating: 4,
      });

      await expect(
        useCase.execute({
          barbershopId: BARBERSHOP_ID,
          appointmentId: 'appointment-1',
          rating: 5,
        }),
      ).rejects.toMatchObject({ code: 'EVALUATION_ALREADY_EXISTS' });
    });
  });

  describe('GetEvaluationStatusUseCase', () => {
    it('retorna canEvaluate true para concluído não avaliado', async () => {
      await seedAppointment();
      const useCase = new GetEvaluationStatusUseCase(evaluationRepository, appointmentRepository);

      const status = await useCase.execute(BARBERSHOP_ID, 'appointment-1');

      expect(status).toEqual({ canEvaluate: true, alreadyEvaluated: false });
    });

    it('retorna alreadyEvaluated true após avaliar', async () => {
      await seedAppointment();
      await new CreateEvaluationUseCase(evaluationRepository, appointmentRepository).execute({
        barbershopId: BARBERSHOP_ID,
        appointmentId: 'appointment-1',
        rating: 5,
      });
      const useCase = new GetEvaluationStatusUseCase(evaluationRepository, appointmentRepository);

      const status = await useCase.execute(BARBERSHOP_ID, 'appointment-1');

      expect(status).toEqual({ canEvaluate: false, alreadyEvaluated: true });
    });
  });
});
