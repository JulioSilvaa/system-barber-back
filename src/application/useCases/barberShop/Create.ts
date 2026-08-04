import { randomUUID } from 'node:crypto';
import { Barbershop, UserBarbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import IdGeneratorRepository from '@/domain/repository/IdGeneratorRepository';
import IUserBarbershopRepository from '@/domain/repository/UserBarbershopRepository';

export type CreateBarberShopInputDTO = {
  name: string;
  slug: string;
  phone: string;
  password?: string;
  ownerId?: string;
};

export default class CreateBarberShopUseCase {
  private readonly _barbershopRepository: IBarbershopRepository;
  private readonly _idGenerator: IdGeneratorRepository;
  private readonly _userBarbershopRepository?: IUserBarbershopRepository;

  constructor(
    barbershopRepository: IBarbershopRepository,
    idGenerator: IdGeneratorRepository,
    userBarbershopRepository?: IUserBarbershopRepository,
  ) {
    this._barbershopRepository = barbershopRepository;
    this._idGenerator = idGenerator;
    this._userBarbershopRepository = userBarbershopRepository;
  }

  async execute(input: CreateBarberShopInputDTO): Promise<Barbershop> {
    const existingBarbershop = await this._barbershopRepository.findBySlug(input.slug);
    if (existingBarbershop) {
      throw new Error('Slug já em uso');
    }

    const barbershop = new Barbershop({
      id: this._idGenerator.generate(),
      name: input.name,
      slug: input.slug,
      phone: input.phone,
      password: input.password,
    });

    await this._barbershopRepository.save(barbershop);

    if (input.ownerId) {
      if (!this._userBarbershopRepository) {
        throw new Error('Repositório de vínculos não configurado');
      }

      await this._userBarbershopRepository.save(
        new UserBarbershop({
          id: randomUUID(),
          userId: input.ownerId,
          barbershopId: barbershop.id,
          localRole: 'OWNER',
        }),
      );
    }

    return barbershop;
  }
}
