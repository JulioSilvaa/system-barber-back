import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '@/infra/http/docs';

export function createSwaggerRouter(): Router {
  const router = Router();

  router.get('/api-docs.json', (_req, res) => {
    res.json(openApiSpec);
  });

  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  return router;
}
