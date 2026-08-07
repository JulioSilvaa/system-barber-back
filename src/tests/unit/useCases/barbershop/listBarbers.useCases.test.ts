import { beforeEach, describe, expect, it } from 'vitest';
import ListBarbersUseCase from '@/application/useCases/barberShop/ListBarbers';
import { User, UserBarbershop } from '@/domain/entities';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';
import UserRepositoryMemory from '@/infra/repositories/inMemory/user/userRepositoryMemory';
import { makeUserBarbershopProps, makeUserProps } from '@/tests/helpers/factories';

describe('ListBarbersUseCase', () => {
  let userBarbershopRepository: UserBarbershopRepositoryMemory;
  let userRepository: UserRepositoryMemory;
  let useCase: ListBarbersUseCase;

  beforeEach(() => {
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
    userRepository = new UserRepositoryMemory();
    useCase = new ListBarbersUseCase(userBarbershopRepository, userRepository);
  });

  it('deve listar apenas os barbeiros com vínculo ativo na barbearia', async () => {
    await userRepository.save(User.create(makeUserProps({ id: 'user-1', name: 'João' })));
    await userRepository.save(User.create(makeUserProps({ id: 'user-2', name: 'Maria' })));

    await userBarbershopRepository.save(
      new UserBarbershop(
        makeUserBarbershopProps({ id: 'm-1', userId: 'user-1', status: 'ACTIVE' }),
      ),
    );
    await userBarbershopRepository.save(
      new UserBarbershop(
        makeUserBarbershopProps({
          id: 'm-2',
          userId: 'user-2',
          status: 'INACTIVE',
        }),
      ),
    );

    const output = await useCase.execute('barbershop-1');

    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(
      expect.objectContaining({ id: 'user-1', name: 'João', localRole: 'BARBER' }),
    );
  });

  it('deve excluir vínculos OWNER da lista pública', async () => {
    await userRepository.save(User.create(makeUserProps({ id: 'user-1', name: 'João' })));
    await userRepository.save(User.create(makeUserProps({ id: 'user-owner', name: 'Dono' })));

    await userBarbershopRepository.save(
      new UserBarbershop(
        makeUserBarbershopProps({
          id: 'm-1',
          userId: 'user-1',
          localRole: 'BARBER',
          status: 'ACTIVE',
        }),
      ),
    );
    await userBarbershopRepository.save(
      new UserBarbershop({
        id: 'm-2',
        userId: 'user-owner',
        barbershopId: 'barbershop-1',
        localRole: 'OWNER',
        status: 'ACTIVE',
      }),
    );

    const output = await useCase.execute('barbershop-1');

    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(
      expect.objectContaining({ id: 'user-1', name: 'João', localRole: 'BARBER' }),
    );
  });

  it('deve retornar lista vazia quando não há barbeiros ativos', async () => {
    const output = await useCase.execute('barbershop-1');

    expect(output).toEqual([]);
  });
});
