import { Barbershop } from '@/domain/entities/Barbershop';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';

export default class ListBarbershopsUseCase {
  constructor(private readonly barbershopRepository: IBarbershopRepository) {}

  async execute(): Promise<Barbershop[]> {
    return this.barbershopRepository.findAll();
  }
}
