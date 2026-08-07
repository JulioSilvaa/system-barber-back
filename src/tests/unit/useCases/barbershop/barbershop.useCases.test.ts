import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateBarberShopUseCase from '@/application/useCases/barberShop/Create';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import BcryptHashService from '@/infra/helpers/BcryptHash';

describe('CreateBarberShopUseCase Unit Tests', () => {
  const BARBERSHOP_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  let barbershopRepository: BarbershopRepositoryMemory;
  let createUseCase: CreateBarberShopUseCase;

  const inputMock = {
    name: 'Barbearia Central',
    slug: 'barbearia-central',
    email: 'contato@barbeariacentral.com',
    phone: '+5516999999999',
    password: 'SenhaForte1',
  };

  beforeEach(() => {
    barbershopRepository = new BarbershopRepositoryMemory();
    createUseCase = new CreateBarberShopUseCase(
      barbershopRepository,
      { generate: vi.fn().mockReturnValue(BARBERSHOP_ID) },
      new BcryptHashService(),
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
          email: inputMock.email,
          phone: inputMock.phone,
          isActive: true,
        }),
      );
      expect(output.password).not.toBe(inputMock.password);
      expect(saved).toBeTruthy();
    });

    it('deve criar a barbearia sem nenhum vínculo de membro (o dono é a própria conta)', async () => {
      const output = await createUseCase.execute(inputMock);

      const saved = await barbershopRepository.findById(BARBERSHOP_ID);
      expect(output.id).toBe(BARBERSHOP_ID);
      expect(saved).toBeTruthy();
      expect(saved).not.toHaveProperty('memberships');
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

    it('deve lançar erro quando o email já está em uso', async () => {
      await createUseCase.execute(inputMock);

      await expect(
        createUseCase.execute({ ...inputMock, slug: 'outra-barbearia' }),
      ).rejects.toThrow('Email já em uso');
    });

    it('deve lançar erro quando a senha é fraca', async () => {
      await expect(createUseCase.execute({ ...inputMock, password: 'fraca' })).rejects.toThrow(
        'Senha deve ter entre 8 e 72 caracteres',
      );
    });
  });
});
