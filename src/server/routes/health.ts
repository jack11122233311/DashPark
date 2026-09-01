import type { FastifyPluginAsync } from 'fastify';
import { globalHealthChecker } from '../services/health-checker.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Returns real-time health map of all services
  fastify.get('/api/v1/health/services', async () => {
    return {
      timestamp: new Date().toISOString(),
      services: globalHealthChecker.getAllStatuses(),
    };
  });

  // On-demand URL ping test endpoint for editor
  fastify.post<{ Body: { url?: string; timeoutMs?: number } }>('/api/v1/health/ping', async (req, reply) => {
    const { url, timeoutMs = 3500 } = req.body || {};

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({ error: 'Missing or invalid "url" in request body' });
    }

    try {
      new URL(url);
    } catch {
      return reply.status(400).send({ error: 'Provided URL is not a valid absolute URL' });
    }

    const result = await globalHealthChecker.pingUrl(url, timeoutMs);
    return reply.send({
      url,
      ...result,
      timestamp: new Date().toISOString(),
    });
  });
};
