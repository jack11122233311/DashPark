import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import type { ConfigLoader } from '../config/loader.js';

export function createAuthRoutes(configLoader: ConfigLoader): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post<{ Body: { pin: string } }>('/api/v1/auth/verify-pin', async (req, reply) => {
      const { pin } = req.body || { pin: '' };
      const configData = configLoader.load();
      const meta = configData.config?.meta;

      const expectedHash = meta?.auth?.pinHash;

      // If no PIN protection is configured, authentication succeeds automatically
      if (!expectedHash) {
        return reply.status(200).send({
          required: false,
          authenticated: true,
        });
      }

      if (!pin) {
        return reply.status(400).send({
          required: true,
          authenticated: false,
          message: 'PIN is required',
        });
      }

      const inputHash = crypto.createHash('sha256').update(pin).digest('hex');
      const isMatch = inputHash === expectedHash;

      return reply.status(200).send({
        required: true,
        authenticated: isMatch,
        message: isMatch ? 'PIN verified' : 'Invalid PIN',
      });
    });

    fastify.post<{ Body: { pin: string } }>('/api/v1/auth/hash-pin', async (req, reply) => {
      const { pin } = req.body || { pin: '' };
      if (!pin) {
        return reply.status(400).send({ error: 'PIN cannot be empty' });
      }

      const hash = crypto.createHash('sha256').update(pin).digest('hex');
      return reply.status(200).send({ hash });
    });
  };
}
