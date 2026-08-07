import { beforeEach, describe, expect, it } from 'vitest';
import ListBarbershopStaffUseCase from '@/application/useCases/barberShop/ListBarbershopStaff';
import { User, UserBarbershop } from '@/domain/entities';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import { makeUserBarbershopProps, makeUserProps } from '@/tests/helpers/factories';

describe('ListBarbershopStaffUseCase', () => {
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let userRepository: UserRepositoryMemory;
  let useCase: ListBarbershopStaffUseCase;

  beforeEach(() => {
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    userRepository = new UserRepositoryMemory();
    useCase = new ListBarbershopStaffUseCase(userBarbershopRepository, userRepository);
  });

  it('deve listar todos os funcionários da barbearia com userId, nome e telefone', async () => {
    await userRepository.save(User.create(makeUserProps({ id: 'user-1', name: 'João' })));
    await userRepository.save(User.create(makeUserProps({ id: 'user-2', name: 'Maria' })));

    await userBarbershopRepository.save(
      new UserBarbershop(makeUserBarbershopProps({ id: 'm-1', userId: 'user-1' })),
    );
    await userBarbershopRepository.save(
      new UserBarbershop(
        makeUserBarbershopProps({ id: 'm-2', userId: 'user-2', status: 'INACTIVE' }),
      ),
    );

    const output = await useCase.execute('barbershop-1');

    expect(output).toHaveLength(2);
    expect(output.map(member => member.name)).toEqual(['João', 'Maria']);
    expect(output.some(member => member.userId === 'user-1' && member.status === 'ACTIVE')).toBe(
      true,
    );
    expect(output.some(member => member.userId === 'user-2' && member.status === 'INACTIVE')).toBe(
      true,
    );
  });

  it('deve incluir os membros OWNER (dono) na listagem interna', async () => {
    await userRepository.save(User.create(makeUserProps({ id: 'user-owner', name: 'Dono' })));

    await userBarbershopRepository.save(
      new UserBarbershop({
        id: 'm-1',
        userId: 'user-owner',
        barbershopId: 'barbershop-1',
        localRole: 'OWNER',
      }),
    );

    const output = await useCase.execute('barbershop-1');

    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(
      expect.objectContaining({ userId: 'user-owner', name: 'Dono', localRole: 'OWNER' }),
    );
  });

  it('deve retornar lista vazia quando não há funcionários', async () => {
    const output = await useCase.execute('barbershop-1');

    expect(output).toEqual([]);
  });
});
