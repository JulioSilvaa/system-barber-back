import { NextFunction, Request, Response } from 'express';

import ProcessAsaasWebhookUseCase from '@/application/useCases/billing/ProcessAsaasWebhook';

export default class WebhookController {
  constructor(private readonly processWebhookUseCase: ProcessAsaasWebhookUseCase) {}

  handleAsaas = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['asaas-access-token'];
    const expected = process.env.ASAAS_WEBHOOK_SECRET;

    if (!expected || typeof token !== 'string' || token !== expected) {
      return res.status(401).json({ message: 'Token do webhook inválido' });
    }

    try {
      const body = req.body as { event?: unknown; payment?: unknown } | undefined;
      const payment = body?.payment as { id?: string } | undefined;
      console.log(
        `[ASAAS WEBHOOK] event=${String(body?.event ?? 'desconhecido')} paymentId=${payment?.id ?? 'n/a'}`,
      );

      await this.processWebhookUseCase.execute({
        event: body?.event,
        payment: payment as never,
      });

      return res.status(200).json({ received: true });
    } catch (error) {
      // Erro de processamento → 500 faz o Asaas recolocar o evento na fila.
      return next(error);
    }
  };
}
