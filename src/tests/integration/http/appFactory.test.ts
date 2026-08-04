import express, { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

function buildTestApp() {
  const app = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}

describe('Health Check', () => {
  it('deveria expor a rota de health check', async () => {
    const app = buildTestApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
  });
});
