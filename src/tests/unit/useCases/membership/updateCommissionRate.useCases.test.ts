import { beforeEach, describe, expect, it } from 'vitest';
import UpdateCommissionRateUseCase from '@/application/useCases/membership/UpdateCommissionRate';
import UserBarbershop from '@/domain/entities/UserBarbershop';
import UserBarbershopRepositoryMemory from '@/infra/repositories/inMemory/userBarbershop/userBarbershopRepositoryMemory';

describe('UpdateCommissionRateUseCase', () => {
  let userBarbershopRepository: UserBarbershopRepositoryMemory;

  const BARBERSHOP_ID = 'barbershop-1';
  const MEMBERSHIP_ID = 'membership-1';

  beforeEach(() => {
    userBarbershopRepository = new UserBarbershopRepositoryMemory();
  });

  async function makeMembership(commissionRate: number | null = null) {
    await userBarbershopRepository.save(
      new UserBarbershop({
        id: MEMBERSHIP_ID,
        userId: 'user-1',
        barbershopId: BARBERSHOP_ID,
        commissionRate,
      }),
    );
  }

  it('atualiza o percentual de comissão do barbeiro', async () => {
    await makeMembership();
    const useCase = new UpdateCommissionRateUseCase(userBarbershopRepository);

    const membership = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      membershipId: MEMBERSHIP_ID,
      commissionRate: 15,
    });

    expect(membership.commissionRate).toBe(15);
  });

  it('permite zerar a comissão (null)', async () => {
    await makeMembership(10);
    const useCase = new UpdateCommissionRateUseCase(userBarbershopRepository);

    const membership = await useCase.execute({
      barbershopId: BARBERSHOP_ID,
      membershipId: MEMBERSHIP_ID,
      commissionRate: null,
    });

    expect(membership.commissionRate).toBeNull();
  });

  it('lança erro para percentual fora de 0-100', async () => {
    await makeMembership();
    const useCase = new UpdateCommissionRateUseCase(userBarbershopRepository);

    await expect(
      useCase.execute({
        barbershopId: BARBERSHOP_ID,
        membershipId: MEMBERSHIP_ID,
        commissionRate: 101,
      }),
    ).rejects.toThrow('Percentual de comissão deve estar entre 0 e 100');
  });

  it('lança erro quando o vínculo não pertence à barbearia', async () => {
    await makeMembership();
    const useCase = new UpdateCommissionRateUseCase(userBarbershopRepository);

    await expect(
      useCase.execute({
        barbershopId: 'outra-barbearia',
        membershipId: MEMBERSHIP_ID,
        commissionRate: 10,
      }),
    ).rejects.toThrow('Vínculo não encontrado');
  });
});
