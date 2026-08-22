import { randomUUID } from 'node:crypto';

import type { Plan } from '@/config/plans';
import { PLAN_MODULES } from '@/config/plans';
import type { PrismaClient } from '@/generated/prisma/client';

export default async function applyPlanModules(
  prisma: PrismaClient,
  barbershopId: string,
  plan: Plan,
): Promise<void> {
  const modules = PLAN_MODULES[plan] ?? [];

  for (const mod of modules) {
    await prisma.featureFlag.upsert({
      where: { barbershopId_module: { barbershopId, module: mod } },
      create: { id: randomUUID(), barbershopId, module: mod, enabled: true, source: 'PLAN' },
      update: { enabled: true, source: 'PLAN' },
    });
  }

  const otherModules = Object.values(PLAN_MODULES)
    .flat()
    .filter(m => !modules.includes(m));

  for (const mod of otherModules) {
    const flag = await prisma.featureFlag.findUnique({
      where: { barbershopId_module: { barbershopId, module: mod } },
    });
    if (flag && flag.source === 'PLAN') {
      await prisma.featureFlag.update({
        where: { id: flag.id },
        data: { enabled: false },
      });
    }
  }
}
