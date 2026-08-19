import webpush from 'web-push';
import { INotificationService, NotificationPayload } from '@/domain/services/INotificationService';
import type { PrismaClient } from '@/generated/prisma/client';

export default class PushNotificationService implements INotificationService {
  constructor(private readonly prisma: PrismaClient) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  async sendToBarbershop(barbershopId: string, payload: NotificationPayload): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { barbershopId },
    });

    const sendPromises = subscriptions.map(sub =>
      this.sendToEndpoint(sub.endpoint, sub.p256dh, sub.auth, payload),
    );

    const results = await Promise.allSettled(sendPromises);

    const expiredEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason as { statusCode?: number };
        if (error.statusCode === 404 || error.statusCode === 410) {
          expiredEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } },
      });
    }
  }

  async sendToEndpoint(
    endpoint: string,
    p256dh: string,
    auth: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const pushPayload = JSON.stringify(payload);
    const pushSubscription = {
      endpoint,
      keys: { p256dh, auth },
    };

    await webpush.sendNotification(pushSubscription, pushPayload);
  }

  generateVapidKeys(): webpush.VapidKeys {
    return webpush.generateVAPIDKeys();
  }
}
