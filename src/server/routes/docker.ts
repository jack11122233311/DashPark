import type { FastifyPluginAsync } from 'fastify';
import { globalDockerSocket } from '../services/docker-socket.js';

export const dockerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/docker/containers', async (_req, reply) => {
    const containers = await globalDockerSocket.getContainers(true);
    return reply.status(200).send({
      available: globalDockerSocket.isSocketAvailable(),
      count: containers.length,
      containers,
    });
  });

  fastify.post<{ Params: { id: string } }>('/api/v1/docker/containers/:id/restart', async (req, reply) => {
    const { id } = req.params;
    if (!id) return reply.status(400).send({ success: false, message: 'Container ID is required' });

    const result = await globalDockerSocket.restartContainer(id);
    return reply.status(result.success ? 200 : 500).send(result);
  });

  fastify.post<{ Params: { id: string } }>('/api/v1/docker/containers/:id/start', async (req, reply) => {
    const { id } = req.params;
    if (!id) return reply.status(400).send({ success: false, message: 'Container ID is required' });

    const result = await globalDockerSocket.startContainer(id);
    return reply.status(result.success ? 200 : 500).send(result);
  });

  fastify.post<{ Params: { id: string } }>('/api/v1/docker/containers/:id/stop', async (req, reply) => {
    const { id } = req.params;
    if (!id) return reply.status(400).send({ success: false, message: 'Container ID is required' });

    const result = await globalDockerSocket.stopContainer(id);
    return reply.status(result.success ? 200 : 500).send(result);
  });
};
