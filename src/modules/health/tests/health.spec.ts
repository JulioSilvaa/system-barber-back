import request from 'supertest';

import { createApp } from '@/app';
import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return API status', async () => {
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'system-barber-api',
    });
  });
});
