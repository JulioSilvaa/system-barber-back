import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '@/domain/errors';
import type { PrismaClient } from '@/generated/prisma/client';

export default class AIController {
  constructor(private readonly prisma: PrismaClient) {}

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.barbershopId)
        ? req.params.barbershopId[0]
        : req.params.barbershopId;

      const settings = await this.prisma.aiSettings.findUnique({
        where: { barbershopId },
      });

      if (!settings) {
        const created = await this.prisma.aiSettings.create({
          data: { id: randomUUID(), barbershopId },
        });
        return res.status(200).json(created);
      }

      return res.status(200).json(settings);
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.barbershopId)
        ? req.params.barbershopId[0]
        : req.params.barbershopId;

      const { followUpDays, autoSend, messageTemplate, confirmationTemplate, cancellationTemplate } =
        req.body ?? {};

      if (followUpDays !== undefined) {
        const days = Number(followUpDays);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
          throw new ValidationError('followUpDays must be between 1 and 365');
        }
      }

      if (autoSend !== undefined && typeof autoSend !== 'boolean') {
        throw new ValidationError('autoSend must be a boolean');
      }

      const existing = await this.prisma.aiSettings.findUnique({
        where: { barbershopId },
      });

      const data: Record<string, unknown> = {};
      if (followUpDays !== undefined) data.followUpDays = Number(followUpDays);
      if (autoSend !== undefined) data.autoSend = autoSend;
      if (messageTemplate !== undefined) data.messageTemplate = String(messageTemplate);
      if (confirmationTemplate !== undefined) data.confirmationTemplate = String(confirmationTemplate);
      if (cancellationTemplate !== undefined) data.cancellationTemplate = String(cancellationTemplate);

      if (existing) {
        const updated = await this.prisma.aiSettings.update({
          where: { barbershopId },
          data,
        });
        return res.status(200).json(updated);
      }

      const created = await this.prisma.aiSettings.create({
        data: { id: randomUUID(), barbershopId, ...data },
      });
      return res.status(200).json(created);
    } catch (error) {
      next(error);
    }
  };

  getInactiveClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barbershopId = Array.isArray(req.params.barbershopId)
        ? req.params.barbershopId[0]
        : req.params.barbershopId;

      const settings = await this.prisma.aiSettings.findUnique({
        where: { barbershopId },
      });
      const followUpDays = settings?.followUpDays ?? 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - followUpDays);

      const customers = await this.prisma.customer.findMany({
        where: { barbershopId },
        include: {
          appointments: {
            where: { barbershopId },
            orderBy: { startDate: 'desc' },
            take: 1,
            select: { startDate: true },
          },
        },
      });

      const result = customers
        .map((c) => {
          const lastVisit = c.appointments[0]?.startDate;
          if (!lastVisit || lastVisit >= cutoffDate) return null;
          const lastVisitDays = Math.floor(
            (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            lastVisit: lastVisit.toISOString(),
            lastVisitDays,
          };
        })
        .filter(Boolean);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
