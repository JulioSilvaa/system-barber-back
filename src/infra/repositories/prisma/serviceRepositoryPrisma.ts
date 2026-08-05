import { Service } from '@/domain/entities/Service';
import { IServiceRepository } from '@/domain/repository/ServiceRepository';
import type { PrismaClient, Service as PrismaService } from '@/generated/prisma/client';

function toEntity(row: PrismaService): Service {
  return new Service({
    id: row.id,
    barbershopId: row.barbershopId,
    name: row.name,
    priceCents: row.priceCents,
    durationMinutes: row.durationMinutes,
    isActive: row.isActive,
  });
}

export default class ServiceRepositoryPrisma implements IServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, barbershopId: string): Promise<Service | null> {
    const row = await this.prisma.service.findFirst({
      where: { id, barbershopId },
    });
    return row ? toEntity(row) : null;
  }

  async findAll(barbershopId: string): Promise<Service[]> {
    const rows = await this.prisma.service.findMany({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async save(service: Service): Promise<Service> {
    const data = {
      id: service.id,
      barbershopId: service.barbershopId,
      name: service.name,
      priceCents: service.priceCents,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
    };

    await this.prisma.service.upsert({
      where: { id: service.id },
      create: data,
      update: data,
    });

    return service;
  }
}
