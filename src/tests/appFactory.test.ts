import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '@/infra/http/express/app';

describe('createApp', () => {
  it('should expose the health route through the express app factory', async () => {
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
  });
});
