import { beforeEach, describe, expect, it } from 'vitest';
import CreateServiceUseCase from '@/application/useCases/service/Create';
import ListServicesUseCase from '@/application/useCases/service/List';
import ServiceRepositoryMemory from '@/infra/repositories/inMemory/service/serviceRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import { Barbershop } from '@/domain/entities/Barbershop';

describe('Service Use Cases Unit Tests', () => {
  let serviceRepository: ServiceRepositoryMemory;
  let barbershopRepository: BarbershopRepositoryMemory;

  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  const inputMock = {
    barbershopId: BARBERSHOP_ID,
    name: 'Corte de cabelo',
    priceCents: 4000,
    durationMinutes: 30,
  };

  beforeEach(async () => {
    serviceRepository = new ServiceRepositoryMemory();
    barbershopRepository = new BarbershopRepositoryMemory();

    await barbershopRepository.save(
      new Barbershop({
        id: BARBERSHOP_ID,
        name: 'Barbearia Central',
        slug: 'barbearia-central',
        phone: '+5516999999999',
      }),
    );
  });

  describe('CreateServiceUseCase', () => {
    it('deve criar e salvar um serviço com ID gerado', async () => {
      const useCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);

      const output = await useCase.execute(inputMock);

      expect(output).toEqual(
        expect.objectContaining({
          barbershopId: BARBERSHOP_ID,
          name: 'Corte de cabelo',
          priceCents: 4000,
          durationMinutes: 30,
          isActive: true,
        }),
      );

      const saved = await serviceRepository.findById(output.id, BARBERSHOP_ID);
      expect(saved).toBeTruthy();
    });

    it('deve lançar erro quando o nome é obrigatório', async () => {
      const useCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);

      await expect(useCase.execute({ ...inputMock, name: '  ' })).rejects.toThrow(
        'Nome do serviço é obrigatório',
      );
    });

    it('deve lançar erro quando a barbearia não existe', async () => {
      const useCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);

      await expect(
        useCase.execute({ ...inputMock, barbershopId: 'barbearia-inexistente' }),
      ).rejects.toThrow('Barbearia não encontrada');
    });

    it('deve lançar erro quando o preço é menor ou igual a zero', async () => {
      const useCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);

      await expect(useCase.execute({ ...inputMock, priceCents: 0 })).rejects.toThrow(
        'price must be greater than zero',
      );
    });

    it('deve lançar erro quando a duração é menor ou igual a zero', async () => {
      const useCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);

      await expect(useCase.execute({ ...inputMock, durationMinutes: 0 })).rejects.toThrow(
        'duration must be greater than zero',
      );
    });
  });

  describe('ListServicesUseCase', () => {
    it('deve listar apenas os serviços da barbearia informada', async () => {
      const createUseCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);
      const listUseCase = new ListServicesUseCase(serviceRepository);

      await createUseCase.execute(inputMock);
      await createUseCase.execute({ ...inputMock, name: 'Barba' });

      const services = await listUseCase.execute(BARBERSHOP_ID);

      expect(services).toHaveLength(2);
      expect(services.map(service => service.name)).toEqual(['Corte de cabelo', 'Barba']);
    });
  });
});
