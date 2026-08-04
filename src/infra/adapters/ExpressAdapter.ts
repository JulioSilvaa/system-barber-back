import { NextFunction, Request, Response } from 'express';

type ExpressHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export default class ExpressAdapter {
  static create(fn: ExpressHandler) {
    return async function (req: Request, res: Response, next: NextFunction) {
      try {
        return await fn(req, res, next);
      } catch (error) {
        return next(error);
      }
    };
  }
}
