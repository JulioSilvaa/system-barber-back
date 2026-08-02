import { NextFunction, Request, Response } from 'express';

export default class HealthController {
  public health = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return res.status(200).json({
        status: 'ok',
        service: 'system-barber-api - Funcionando normalmente',
      });
    } catch (error) {
      next(error);
    }
  };
}
