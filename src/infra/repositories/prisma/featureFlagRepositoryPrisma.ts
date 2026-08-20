import { randomUUID } from 'node:crypto';
import { IFeatureFlagRepository, FeatureFlag } from '@/domain/repository/FeatureFlagRepository';
import type { PrismaClient } from '@/generated/prisma/client';

export default class FeatureFlagRepositoryPrisma implements IFeatureFlagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findEnabledByBarbershop(barbershopId: string): Promise<string[]> {
    const flags = await this.prisma.featureFlag.findMany({
      where: { barbershopId, enabled: true },
      select: { module: true },
    });
    return flags.map((f) => f.module);
  }

  async upsert(
    barbershopId: string,
    module: string,
    enabled: boolean,
    source = 'MANUAL',
  ): Promise<FeatureFlag> {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { barbershopId_module: { barbershopId, module } },
    });

    if (existing) {
      const row = await this.prisma.featureFlag.update({
        where: { id: existing.id },
        data: { enabled, source },
      });
      return {
        barbershopId: row.barbershopId,
        module: row.module,
        enabled: row.enabled,
        source: row.source,
      };
    }

    const row = await this.prisma.featureFlag.create({
      data: { id: randomUUID(), barbershopId, module, enabled, source },
    });
    return {
      barbershopId: row.barbershopId,
      module: row.module,
      enabled: row.enabled,
      source: row.source,
    };
  }
}
