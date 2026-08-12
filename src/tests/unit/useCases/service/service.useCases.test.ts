import { beforeEach, describe, expect, it } from 'vitest';
import CreateServiceUseCase from '@/application/useCases/service/Create';
import ListServicesUseCase from '@/application/useCases/service/List';
import UpdateServiceUseCase from '@/application/useCases/service/Update';
import SetServiceActiveUseCase from '@/application/useCases/service/SetActive';
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
        email: 'contato@barbeariacentral.com',
        phone: '+5516999999999',
        password: 'SenhaForte1',
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

  describe('UpdateServiceUseCase', () => {
    it('deve atualizar nome, preço e duração do serviço', async () => {
      const createUseCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);
      const updateUseCase = new UpdateServiceUseCase(serviceRepository);

      const created = await createUseCase.execute(inputMock);

      const updated = await updateUseCase.execute({
        serviceId: created.id,
        barbershopId: BARBERSHOP_ID,
        name: 'Corte + Barba',
        priceCents: 6500,
        durationMinutes: 45,
      });

      expect(updated).toEqual(
        expect.objectContaining({
          id: created.id,
          name: 'Corte + Barba',
          priceCents: 6500,
          durationMinutes: 45,
        }),
      );
    });

    it('deve lançar erro quando o serviço não existe na barbearia', async () => {
      const updateUseCase = new UpdateServiceUseCase(serviceRepository);

      await expect(
        updateUseCase.execute({
          serviceId: 'servico-inexistente',
          barbershopId: BARBERSHOP_ID,
          name: 'Qualquer',
        }),
      ).rejects.toThrow('Serviço não encontrado');
    });
  });

  describe('SetServiceActiveUseCase', () => {
    it('deve desativar e reativar um serviço', async () => {
      const createUseCase = new CreateServiceUseCase(serviceRepository, barbershopRepository);
      const setActiveUseCase = new SetServiceActiveUseCase(serviceRepository);

      const created = await createUseCase.execute(inputMock);
      expect(created.isActive).toBe(true);

      const deactivated = await setActiveUseCase.execute({
        serviceId: created.id,
        barbershopId: BARBERSHOP_ID,
        isActive: false,
      });
      expect(deactivated.isActive).toBe(false);

      const reactivated = await setActiveUseCase.execute({
        serviceId: created.id,
        barbershopId: BARBERSHOP_ID,
        isActive: true,
      });
      expect(reactivated.isActive).toBe(true);
    });

    it('deve lançar erro quando o serviço não existe', async () => {
      const setActiveUseCase = new SetServiceActiveUseCase(serviceRepository);

      await expect(
        setActiveUseCase.execute({
          serviceId: 'servico-inexistente',
          barbershopId: BARBERSHOP_ID,
          isActive: false,
        }),
      ).rejects.toThrow('Serviço não encontrado');
    });
  });
});
