import 'dotenv/config';

import { createServer } from 'http';
import cron from 'node-cron';

import { createApp } from './app';
import { initSocketServer } from '@/infra/websocket/socketServer';
import { getPrismaClient } from '@/infra/database/prisma';
import { createRepositorySet } from '@/infra/repositories/factory';
import SendRemindersUseCase from '@/application/useCases/appointment/SendReminders';
import PushNotificationService from '@/infra/services/PushNotificationService';

const PORT = process.env.PORT ?? 3333;

const app = createApp();
const httpServer = createServer(app);
initSocketServer(httpServer);

if (process.env.NODE_ENV !== 'test') {
  const prisma = getPrismaClient();
  const repositories = createRepositorySet({ prisma });
  const pushService = new PushNotificationService(prisma);
  const sendRemindersUseCase = new SendRemindersUseCase(
    repositories.appointmentRepository,
    repositories.barbershopRepository,
    pushService,
  );

  cron.schedule('*/30 * * * *', async () => {
    console.log('[CRON] Running reminder check...');
    try {
      const barbershops = await prisma.barbershop.findMany({ where: { isActive: true } });
      for (const barbershop of barbershops) {
        const result = await sendRemindersUseCase.execute(barbershop.id);
        if (result.sent > 0) {
          console.log(`[CRON] Sent ${result.sent} reminders for ${barbershop.name}`);
        }
      }
    } catch (error) {
      console.error('[CRON] Error sending reminders:', error);
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
  });
}

export default app;
