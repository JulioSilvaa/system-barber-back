import { Router } from 'express';

export function createSwaggerRouter(): Router {
  const router = Router();

  router.get('/api-docs.json', (_req, res) => {
    res.json({ openapi: '3.0.0', info: { title: 'System Barber API', version: '1.0.0' } });
  });

  return router;
}
