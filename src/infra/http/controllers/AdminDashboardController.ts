import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

const PLAN_MODULES: Record<string, string[]> = {
  BASIC: ['COPILOT', 'WHATSAPP'],
  PRO: ['COPILOT', 'WHATSAPP', 'MARKETING'],
};

export default class AdminDashboardController {
  constructor(private readonly prisma: PrismaClient) {}

  dashboard = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [totalBarbershops, subscriptions, canceledLast30Days, barbershopRows] =
        await Promise.all([
          this.prisma.barbershop.count(),
          this.prisma.subscription.findMany({
            select: { barbershopId: true, plan: true, status: true, mrrCents: true },
          }),
          this.prisma.subscription.count({
            where: { status: 'CANCELED', updatedAt: { gte: thirtyDaysAgo } },
          }),
          this.prisma.barbershop.findMany({
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              overrideMarketingModule: true,
              subscriptions: { select: { plan: true, status: true, mrrCents: true }, take: 1 },
              featureFlags: { select: { module: true, enabled: true, source: true } },
            },
            orderBy: { name: 'asc' },
          }),
        ]);

      const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE').length;
      const mrrCents = subscriptions
        .filter(s => s.status === 'ACTIVE')
        .reduce((sum, s) => sum + s.mrrCents, 0);

      const mrrByPlan: Record<string, number> = {};
      for (const s of subscriptions) {
        if (s.status === 'ACTIVE') {
          mrrByPlan[s.plan] = (mrrByPlan[s.plan] ?? 0) + s.mrrCents;
        }
      }

      const churnBase = activeSubscriptions + canceledLast30Days;
      const churnRatePct =
        churnBase > 0 ? Math.round((canceledLast30Days / churnBase) * 1000) / 10 : 0;

      const barbershops = barbershopRows.map(b => {
        const enabledModules = b.featureFlags.filter(f => f.enabled).map(f => f.module);
        const overriddenModules = b.featureFlags
          .filter(f => f.enabled && f.source === 'MANUAL')
          .map(f => f.module);

        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          isActive: b.isActive,
          overrideMarketingModule: b.overrideMarketingModule ?? false,
          plan: b.subscriptions[0]?.plan ?? 'BASIC',
          status: b.subscriptions[0]?.status ?? 'ACTIVE',
          mrrCents: b.subscriptions[0]?.mrrCents ?? 0,
          enabledModules,
          overriddenModules,
        };
      });

      return res.status(200).json({
        metrics: {
          totalBarbershops,
          activeSubscriptions,
          mrrCents,
          mrrByPlan,
          canceledLast30Days,
          churnRatePct,
        },
        barbershops,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { plan } = req.body ?? {};

      if (!plan || !['BASIC', 'PRO'].includes(plan)) {
        throw new ValidationError('plan must be BASIC or PRO');
      }

      const MRR_BY_PLAN: Record<string, number> = { BASIC: 9990, PRO: 19990 };
      const newStatus = plan === 'PRO' ? 'ACTIVE' : 'ACTIVE';

      await this.prisma.barbershop.update({
        where: { id: barbershopId },
        data: { plan, status: newStatus },
      });

      const subscription = await this.prisma.subscription.findUnique({
        where: { barbershopId },
      });

      if (!subscription) {
        await this.prisma.subscription.create({
          data: {
            id: randomUUID(),
            barbershopId,
            plan,
            status: newStatus,
            mrrCents: MRR_BY_PLAN[plan] ?? 0,
            trialEndsAt: null,
          },
        });
      } else {
        await this.prisma.subscription.update({
          where: { barbershopId },
          data: { plan, status: newStatus, mrrCents: MRR_BY_PLAN[plan] ?? 0, trialEndsAt: null },
        });
      }

      const defaultModules = PLAN_MODULES[plan] ?? [];
      for (const mod of defaultModules) {
        const existing = await this.prisma.featureFlag.findUnique({
          where: { barbershopId_module: { barbershopId, module: mod } },
        });
        if (!existing) {
          await this.prisma.featureFlag.create({
            data: { id: randomUUID(), barbershopId, module: mod, enabled: true, source: 'PLAN' },
          });
        } else if (existing.source === 'PLAN') {
          await this.prisma.featureFlag.update({
            where: { id: existing.id },
            data: { enabled: true },
          });
        }
      }

      return res.status(200).json({ plan, status: newStatus });
    } catch (error) {
      next(error);
    }
  };

  updateModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { module: mod, enabled, reset } = req.body ?? {};

      if (!mod || typeof mod !== 'string') {
        throw new ValidationError('module is required');
      }

      if (reset) {
        const existing = await this.prisma.featureFlag.findUnique({
          where: { barbershopId_module: { barbershopId, module: mod } },
        });
        if (existing && existing.source === 'MANUAL') {
          const sub = await this.prisma.subscription.findUnique({ where: { barbershopId } });
          const defaultEnabled = (PLAN_MODULES[sub?.plan ?? 'BASIC'] ?? []).includes(mod);
          await this.prisma.featureFlag.update({
            where: { id: existing.id },
            data: { enabled: defaultEnabled, source: 'PLAN' },
          });
        }
        return res.status(200).json({ module: mod, reset: true });
      }

      if (typeof enabled !== 'boolean') {
        throw new ValidationError('enabled must be a boolean');
      }

      const existing = await this.prisma.featureFlag.findUnique({
        where: { barbershopId_module: { barbershopId, module: mod } },
      });

      if (existing) {
        await this.prisma.featureFlag.update({
          where: { id: existing.id },
          data: { enabled, source: 'MANUAL' },
        });
      } else {
        await this.prisma.featureFlag.create({
          data: { id: randomUUID(), barbershopId, module: mod, enabled, source: 'MANUAL' },
        });
      }

      return res.status(200).json({ module: mod, enabled });
    } catch (error) {
      next(error);
    }
  };

  listBarbershops = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await this.prisma.barbershop.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          subscriptions: { select: { plan: true, status: true, mrrCents: true }, take: 1 },
          featureFlags: { select: { module: true, enabled: true, source: true } },
        },
        orderBy: { name: 'asc' },
      });

      const result = rows.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        email: b.email,
        phone: b.phone,
        isActive: b.isActive,
        createdAt: b.createdAt,
        plan: b.subscriptions[0]?.plan ?? 'BASIC',
        status: b.subscriptions[0]?.status ?? 'ACTIVE',
        mrrCents: b.subscriptions[0]?.mrrCents ?? 0,
        enabledModules: b.featureFlags.filter(f => f.enabled).map(f => f.module),
        overriddenModules: b.featureFlags
          .filter(f => f.enabled && f.source === 'MANUAL')
          .map(f => f.module),
      }));

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { isActive } = req.body ?? {};

      if (typeof isActive !== 'boolean') {
        throw new ValidationError('isActive must be a boolean');
      }

      await this.prisma.barbershop.update({
        where: { id: barbershopId },
        data: { isActive },
      });

      return res.status(200).json({ isActive });
    } catch (error) {
      next(error);
    }
  };

  overridePro = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { override } = req.body ?? {};

      if (typeof override !== 'boolean') {
        throw new ValidationError('override must be a boolean');
      }

      await this.prisma.barbershop.update({
        where: { id: barbershopId },
        data: { overrideMarketingModule: override },
      });

      return res.status(200).json({ overrideMarketingModule: override });
    } catch (error) {
      next(error);
    }
  };
}
