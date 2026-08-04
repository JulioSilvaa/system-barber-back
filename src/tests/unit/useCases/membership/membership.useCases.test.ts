import { beforeEach, describe, expect, it } from 'vitest';
import ListMembershipsUseCase from '@/application/useCases/membership/List';
import SwitchBarbershopUseCase from '@/application/useCases/membership/Switch';
import OnboardUserUseCase from '@/application/useCases/membership/Onboard';
import AddBarberToBarbershopUseCase from '@/application/useCases/membership/AddBarber';
import UserBarbershop from '@/domain/entities/UserBarbershop';
import User from '@/domain/entities/User';
import { Barbershop } from '@/domain/entities/Barbershop';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import BarbershopRepositoryMemory from '@/infra/repositories/inMemory/barbeshop/barbeshopRepositoryMemory';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import {
  makeUserProps,
  makeBarbershopProps,
  makeUserBarbershopProps,
} from '@/tests/helpers/factories';

describe('Membership Use Cases Unit Tests', () => {
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let userRepository: UserRepositoryMemory;
  let barbershopRepository: BarbershopRepositoryMemory;

  let listUseCase: ListMembershipsUseCase;
  let switchUseCase: SwitchBarbershopUseCase;
  let onboardUseCase: OnboardUserUseCase;
  let addBarberUseCase: AddBarberToBarbershopUseCase;

  const barbershop1 = new Barbershop(makeBarbershopProps());
  const barbershop2 = new Barbershop(
    makeBarbershopProps({ id: 'barbershop-2', slug: 'barbearia-norte' }),
  );

  beforeEach(() => {
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    userRepository = new UserRepositoryMemory();
    barbershopRepository = new BarbershopRepositoryMemory();

    listUseCase = new ListMembershipsUseCase(userBarbershopRepository);
    switchUseCase = new SwitchBarbershopUseCase(userBarbershopRepository);
    onboardUseCase = new OnboardUserUseCase(userBarbershopRepository);
    addBarberUseCase = new AddBarberToBarbershopUseCase(
      userBarbershopRepository,
      userRepository,
      barbershopRepository,
    );
  });

  describe('ListMembershipsUseCase', () => {
    it('deve listar os vínculos de um usuário', async () => {
      const membership1 = new UserBarbershop(makeUserBarbershopProps());
      const membership2 = new UserBarbershop(
        makeUserBarbershopProps({ id: 'membership-2', barbershopId: barbershop2.id }),
      );
      await userBarbershopRepository.save(membership1);
      await userBarbershopRepository.save(membership2);

      const output = await listUseCase.execute('user-1');

      expect(output).toHaveLength(2);
      expect(output[0].barbershopId).toBe(barbershop1.id);
      expect(output[1].barbershopId).toBe(barbershop2.id);
    });

    it('deve retornar uma lista vazia quando o usuário não tem vínculos', async () => {
      const output = await listUseCase.execute('user-sem-vinculo');

      expect(output).toEqual([]);
    });
  });

  describe('SwitchBarbershopUseCase', () => {
    it('deve ativar o vínculo de destino e inativar o atual', async () => {
      await userBarbershopRepository.save(new UserBarbershop(makeUserBarbershopProps()));
      await userBarbershopRepository.save(
        new UserBarbershop(
          makeUserBarbershopProps({
            id: 'membership-2',
            barbershopId: barbershop2.id,
            status: 'INACTIVE',
          }),
        ),
      );

      const output = await switchUseCase.execute('user-1', barbershop2.id);

      const memberships = await userBarbershopRepository.findByUserId('user-1');
      const current = memberships.find(m => m.barbershopId === barbershop1.id);
      const target = memberships.find(m => m.barbershopId === barbershop2.id);

      expect(output.barbershopId).toBe(barbershop2.id);
      expect(output.status).toBe('ACTIVE');
      expect(current?.status).toBe('INACTIVE');
      expect(target?.status).toBe('ACTIVE');
    });

    it('deve lançar erro quando o usuário não tem vínculo com a barbearia de destino', async () => {
      await userBarbershopRepository.save(new UserBarbershop(makeUserBarbershopProps()));

      await expect(switchUseCase.execute('user-1', barbershop2.id)).rejects.toThrow(
        'Vínculo não encontrado',
      );
    });
  });

  describe('OnboardUserUseCase', () => {
    it('deve criar um vínculo ativo entre usuário e barbearia', async () => {
      const output = await onboardUseCase.execute('user-1', barbershop1.id);

      expect(output.userId).toBe('user-1');
      expect(output.barbershopId).toBe(barbershop1.id);
      expect(output.status).toBe('ACTIVE');
      expect(output.localRole).toBe('BARBER');

      const saved = await userBarbershopRepository.findByUserAndBarbershop(
        'user-1',
        barbershop1.id,
      );
      expect(saved).toBeTruthy();
    });

    it('deve lançar erro quando o vínculo já existe', async () => {
      await userBarbershopRepository.save(new UserBarbershop(makeUserBarbershopProps()));

      await expect(onboardUseCase.execute('user-1', barbershop1.id)).rejects.toThrow(
        'Vínculo já existente',
      );
    });
  });

  describe('AddBarberToBarbershopUseCase', () => {
    it('deve vincular um barbeiro a uma barbearia', async () => {
      await userRepository.save(User.create(makeUserProps()));
      await barbershopRepository.save(barbershop1);

      const output = await addBarberUseCase.execute({
        userId: 'user-1',
        barbershopId: barbershop1.id,
      });

      expect(output.userId).toBe('user-1');
      expect(output.barbershopId).toBe(barbershop1.id);
      expect(output.status).toBe('ACTIVE');
      expect(output.localRole).toBe('BARBER');
    });

    it('deve lançar erro quando o usuário não existe', async () => {
      await barbershopRepository.save(barbershop1);

      await expect(
        addBarberUseCase.execute({ userId: 'user-inexistente', barbershopId: barbershop1.id }),
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('deve lançar erro quando a barbearia não existe', async () => {
      await userRepository.save(User.create(makeUserProps()));

      await expect(
        addBarberUseCase.execute({ userId: 'user-1', barbershopId: 'barbershop-inexistente' }),
      ).rejects.toThrow('Barbearia não encontrada');
    });

    it('deve lançar erro quando o vínculo já existe', async () => {
      await userRepository.save(User.create(makeUserProps()));
      await barbershopRepository.save(barbershop1);
      await userBarbershopRepository.save(new UserBarbershop(makeUserBarbershopProps()));

      await expect(
        addBarberUseCase.execute({ userId: 'user-1', barbershopId: barbershop1.id }),
      ).rejects.toThrow('Vínculo já existente');
    });
  });
});
