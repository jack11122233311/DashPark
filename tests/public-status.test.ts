import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { healthRoutes } from '../src/server/routes/health.js';

describe('Public Status Endpoint', () => {
  it('GET /api/v1/status/public returns sanitized SLA statistics and health response', async () => {
    const fastify = Fastify();
    await fastify.register(healthRoutes);

    const res = await fastify.inject({
      method: 'GET',
      url: '/api/v1/status/public',
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);

    expect(data).toHaveProperty('systemStatus');
    expect(data).toHaveProperty('slaPercentage');
    expect(data).toHaveProperty('totalServices');
    expect(data).toHaveProperty('onlineServices');
    expect(data).toHaveProperty('offlineServices');
    expect(Array.isArray(data.services)).toBe(true);
  });
});
