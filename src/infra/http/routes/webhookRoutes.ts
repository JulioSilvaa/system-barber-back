import { Router } from 'express';

import ProcessAsaasWebhookUseCase from '@/application/useCases/billing/ProcessAsaasWebhook';
import type { PrismaClient } from '@/generated/prisma/client';
import ExpressAdapter from '@/infra/adapters/ExpressAdapter';
import WebhookController from '../controllers/WebhookController';

export interface WebhookRoutesDeps {
  prisma: PrismaClient;
}

export default function createWebhookRoutes(deps: WebhookRoutesDeps) {
  const router = Router();

  const controller = new WebhookController(new ProcessAsaasWebhookUseCase(deps.prisma));

  router.post('/webhooks/asaas', ExpressAdapter.create(controller.handleAsaas));

  return router;
}
