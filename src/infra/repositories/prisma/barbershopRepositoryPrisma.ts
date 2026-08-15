import { Barbershop } from '@/domain/entities';
import { IBarbershopRepository } from '@/domain/repository/BarbershopRepository';
import type { Barbershop as PrismaBarbershop, PrismaClient } from '@/generated/prisma/client';

function toEntity(row: PrismaBarbershop): Barbershop {
  return new Barbershop({
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    phone: row.phone,
    password: row.password,
    primaryColor: row.primaryColor ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
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
    if (!slug || slug.trim() === '') {
      return null;
    }
    const row = await this.prisma.barbershop.findUnique({ where: { slug } });
    return row ? toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<Barbershop | null> {
    const row = await this.prisma.barbershop.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row ? toEntity(row) : null;
  }

  async save(barbershop: Barbershop): Promise<Barbershop> {
    const data = {
      id: barbershop.id,
      name: barbershop.name,
      slug: barbershop.slug,
      email: barbershop.email,
      phone: barbershop.phone,
      password: barbershop.password,
      primaryColor: barbershop.primaryColor ?? null,
      logoUrl: barbershop.logoUrl ?? null,
      isActive: barbershop.isActive,
    };

    await this.prisma.barbershop.upsert({
      where: { id: barbershop.id },
      create: data,
      update: data,
    });

    return barbershop;
  }

  async setActive(id: string, isActive: boolean): Promise<Barbershop | null> {
    const result = await this.prisma.barbershop.updateMany({
      where: { id },
      data: { isActive },
    });

    if (result.count === 0) {
      return null;
    }

    const row = await this.prisma.barbershop.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async update(
    id: string,
    data: Partial<Pick<Barbershop, 'name' | 'primaryColor' | 'logoUrl'>>,
  ): Promise<Barbershop | null> {
    const result = await this.prisma.barbershop.updateMany({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.primaryColor !== undefined ? { primaryColor: data.primaryColor } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      },
    });

    if (result.count === 0) {
      return null;
    }

    const row = await this.prisma.barbershop.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }
}
