import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateBarberShopUseCase from '@/application/useCases/barberShop/Create';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

describe('CreateBarberShopUseCase Unit Tests', () => {
  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  let barbershopRepository: BarbershopRepositoryMemory;
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let createUseCase: CreateBarberShopUseCase;

  const inputMock = {
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    phone: '+5516999999999',
    password: 'SenhaForte1',
  };

  beforeEach(() => {
    barbershopRepository = new BarbershopRepositoryMemory();
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    createUseCase = new CreateBarberShopUseCase(
      barbershopRepository,
      { generate: vi.fn().mockReturnValue(BARBERSHOP_ID) },
      userBarbershopRepository,
    );
  });

  describe('Criação', () => {
    it('deve criar e salvar uma barbearia com ID gerado', async () => {
      const output = await createUseCase.execute(inputMock);

      const saved = await barbershopRepository.findById(BARBERSHOP_ID);

      expect(output).toEqual(
        expect.objectContaining({
          id: BARBERSHOP_ID,
          name: inputMock.name,
          slug: inputMock.slug,
          phone: inputMock.phone,
          isActive: true,
        }),
      );
      expect(saved).toBeTruthy();
    });

    it('deve criar o vínculo de OWNER quando ownerId é informado', async () => {
      await createUseCase.execute({ ...inputMock, ownerId: 'user-owner' });

      const memberships = await userBarbershopRepository.findByUserAndBarbershop(
        'user-owner',
        BARBERSHOP_ID,
      );

      expect(memberships).toBeTruthy();
      expect(memberships?.localRole).toBe('OWNER');
      expect(memberships?.status).toBe('ACTIVE');
    });

    it('não deve criar vínculo quando ownerId não é informado', async () => {
      await createUseCase.execute(inputMock);

      const memberships = await userBarbershopRepository.findByUserId('user-owner');

      expect(memberships).toEqual([]);
    });
  });

  describe('Validações', () => {
    it('deve lançar erro quando o slug já está em uso', async () => {
      await createUseCase.execute(inputMock);

      await expect(
        createUseCase.execute({ ...inputMock, name: 'Outra Barbearia' }),
      ).rejects.toThrow('Slug já em uso');
    });

    it('deve lançar erro quando o slug é inválido', async () => {
      await expect(createUseCase.execute({ ...inputMock, slug: 'Slug Inválido' })).rejects.toThrow(
        'slug must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('deve lançar erro quando o telefone é inválido', async () => {
      await expect(createUseCase.execute({ ...inputMock, phone: '123' })).rejects.toThrow(
        'phone must be a valid international phone number',
      );
    });
  });
});
