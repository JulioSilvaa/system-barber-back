import { Barbershop } from "@/domain/entities";
import { IBarbershopRepository } from "@/domain/repository/BarbershopRepository";


export default class CreateBarberShopUseCase {
  private readonly _barbershopRepository: IBarbershopRepository;

  constructor(barbershopRepository: IBarbershopRepository) {
    this._barbershopRepository = barbershopRepository;
  }

  async execute(input: Barbershop): Promise<void> {
    // const existingUser = await this._userRepository.findByEmail(input.email);
    // if (existingUser) {
    //   throw new Error("email already exists");
    // }
    // Lógica para criar um barbearia


    const newBarbershop = new Barbershop({
      id: input.id,
      name: input.name,
      slug: input.slug,
      phone: input.phone,
      isActive: input.isActive,
      password: input.password
    });

    await this._barbershopRepository.save(newBarbershop);
    console.log('Criando barbearia com os dados:', input);
  }
}