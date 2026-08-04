import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import healthRoutes from '@/infra/http/routes/healthRoutes';

function buildTestApp() {
  const app = express();
  app.use(healthRoutes);
  return app;
}

describe('Health Check Integration', () => {
  it('deve expor a rota real de health check', async () => {
    const app = buildTestApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok - rodando normalmente' });
  });
});
