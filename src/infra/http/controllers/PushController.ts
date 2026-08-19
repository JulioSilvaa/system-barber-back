import { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@/generated/prisma/client';
import PushNotificationService from '@/infra/services/PushNotificationService';

export default class PushController {
  private readonly pushService: PushNotificationService;

  constructor(prisma: PrismaClient) {
    this.pushService = new PushNotificationService(prisma);
  }

  getVapidPublicKey = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      if (!publicKey) {
        return res.status(503).json({ message: 'Push notifications not configured' });
      }
      return res.status(200).json({ publicKey });
    } catch (error) {
      next(error);
    }
  };

  subscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const { endpoint, p256dh, auth, userAgent } = req.body;

      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: 'Missing push subscription data' });
      }

      const prisma = (this.pushService as unknown as { prisma: PrismaClient }).prisma;
      await prisma.pushSubscription.upsert({
        where: { barbershopId_endpoint: { barbershopId, endpoint } },
        create: { barbershopId, endpoint, p256dh, auth, userAgent },
        update: { p256dh, auth, userAgent },
      });

      return res.status(201).json({ message: 'Subscribed to push notifications' });
    } catch (error) {
      next(error);
    }
  };

  unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBarbershopId = req.params.barbershopId;
      const barbershopId =
        req.barbershopId ?? (Array.isArray(rawBarbershopId) ? rawBarbershopId[0] : rawBarbershopId);
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: 'Missing endpoint' });
      }

      const prisma = (this.pushService as unknown as { prisma: PrismaClient }).prisma;
      await prisma.pushSubscription.deleteMany({
        where: { barbershopId, endpoint },
      });

      return res.status(200).json({ message: 'Unsubscribed from push notifications' });
    } catch (error) {
      next(error);
    }
  };
}
