import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { systemRoutes } from '../src/server/routes/system.js';

describe('Detailed System Stats Endpoint', () => {
  it('returns host cpu, memory, disk, and process telemetry', async () => {
    const fastify = Fastify();
    await fastify.register(systemRoutes);

    const res = await fastify.inject({
      method: 'GET',
      url: '/api/v1/system/stats',
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);

    expect(data.host).toBeDefined();
    expect(data.host.cpuCount).toBeGreaterThan(0);
    expect(data.host.memory.totalMb).toBeGreaterThan(0);
    expect(data.host.disk).toBeDefined();
    expect(data.dashpark.version).toBeDefined();
  });
});
