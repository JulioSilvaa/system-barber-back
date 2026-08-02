import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '@/infra/http/express/app';

describe('UserController HTTP', () => {
  it('should create a user via HTTP', async () => {
    const app = createApp();

    const response = await request(app).post('/api/users').send({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '11999999999',
      barbershopId: '123e4567-e89b-41d3-a456-426614174000',
      password: 'Password123',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        email: 'john@example.com',
      }),
    );
  });
});
