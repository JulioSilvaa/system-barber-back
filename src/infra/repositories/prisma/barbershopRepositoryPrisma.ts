import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import type { Barbershop as PrismaBarbershop, PrismaClient } from '@/generated/prisma/client';

function toEntity(row: PrismaBarbershop): Barbershop {
  return new Barbershop({
    id: row.id,
    name: row.name,
    slug: row.slug,
    phone: row.phone,
    password: row.password ?? undefined,
    isActive: row.isActive,
  });
}

export default class BarbershopRepositoryPrisma implements IBarbershopRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Barbershop | null> {
    const row = await this.prisma.barbershop.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Barbershop | null> {
    const row = await this.prisma.barbershop.findUnique({ where: { slug } });
    return row ? toEntity(row) : null;
  }

  async save(barbershop: Barbershop): Promise<Barbershop> {
    const data = {
      id: barbershop.id,
      name: barbershop.name,
      slug: barbershop.slug,
      phone: barbershop.phone,
      password: barbershop.password ?? null,
      isActive: barbershop.isActive,
    };

    await this.prisma.barbershop.upsert({
      where: { id: barbershop.id },
      create: data,
      update: data,
    });

    return barbershop;
  }
}
