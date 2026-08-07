import { beforeEach, describe, expect, it } from 'vitest';
import CreateCustomerUseCase from '@/application/useCases/customer/Create';
import ListCustomersUseCase from '@/application/useCases/customer/List';
import { Barbershop } from '@/domain/entities/Barbershop';
import CustomerRepositoryMemory from '@/infra/repositories/inMemory/customer/customerRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';

describe('Customer Use Cases Unit Tests', () => {
  let customerRepository: CustomerRepositoryMemory;
  let barbershopRepository: BarbershopRepositoryMemory;

  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  beforeEach(async () => {
    customerRepository = new CustomerRepositoryMemory();
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

  describe('CreateCustomerUseCase', () => {
    it('deve criar e salvar um cliente com ID gerado', async () => {
      const useCase = new CreateCustomerUseCase(customerRepository, barbershopRepository);

      const output = await useCase.execute({
        barbershopId: BARBERSHOP_ID,
        name: 'Maria Souza',
        phone: '16988888888',
      });

      expect(output).toEqual(
        expect.objectContaining({
          barbershopId: BARBERSHOP_ID,
          name: 'Maria Souza',
          phone: '16988888888',
          isActive: true,
        }),
      );
      expect(output.id).toBeTruthy();
    });

    it('deve lançar erro quando a barbearia não existe', async () => {
      const useCase = new CreateCustomerUseCase(customerRepository, barbershopRepository);

      await expect(
        useCase.execute({ barbershopId: 'inexistente', name: 'Maria', phone: '16988888888' }),
      ).rejects.toThrow('Barbearia não encontrada');
    });

    it('deve lançar erro quando o telefone já está cadastrado na barbearia', async () => {
      const useCase = new CreateCustomerUseCase(customerRepository, barbershopRepository);
      await useCase.execute({ barbershopId: BARBERSHOP_ID, name: 'Maria', phone: '16988888888' });

      await expect(
        useCase.execute({ barbershopId: BARBERSHOP_ID, name: 'Outro Nome', phone: '16988888888' }),
      ).rejects.toThrow('Cliente já cadastrado');
    });
  });

  describe('ListCustomersUseCase', () => {
    it('deve listar apenas os clientes da barbearia informada', async () => {
      const createUseCase = new CreateCustomerUseCase(customerRepository, barbershopRepository);
      const listUseCase = new ListCustomersUseCase(customerRepository);

      await createUseCase.execute({
        barbershopId: BARBERSHOP_ID,
        name: 'Maria',
        phone: '16988888888',
      });
      await createUseCase.execute({
        barbershopId: BARBERSHOP_ID,
        name: 'João',
        phone: '16977777777',
      });

      const customers = await listUseCase.execute(BARBERSHOP_ID);

      expect(customers).toHaveLength(2);
      expect(customers.map(customer => customer.name)).toEqual(['Maria', 'João']);
    });
  });
});
