import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { ConfigLoader } from './config/loader.js';
import { parseConfig } from './config/parser.js';
import { iconRoutes } from './routes/icons.js';
import { healthRoutes } from './routes/health.js';
import { systemRoutes } from './routes/system.js';
import { createConfigRoutes } from './routes/config.js';
import { globalHealthChecker } from './services/health-checker.js';
import type { ServerHealthResponse } from '../shared/types.js';

const startTime = Date.now();
const VERSION = '0.0.1';
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

export const fastify = Fastify({
  logger: false,
});

export const configLoader = new ConfigLoader();

export async function setupServer() {
  await fastify.register(cors, {
    origin: true,
  });

  // Register Route Plugins
  await fastify.register(iconRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(systemRoutes);
  await fastify.register(createConfigRoutes(configLoader));

  // --- API Routes ---

  // Health check endpoint
  fastify.get('/api/v1/health', async (): Promise<ServerHealthResponse> => {
    const memory = process.memoryUsage();
    const memoryMb = Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100;

    return {
      status: 'ok',
      version: VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: memoryMb,
      timestamp: new Date().toISOString(),
    };
  });

  // Config retrieval endpoint
  fastify.get('/api/v1/config', async (_req, reply) => {
    const configData = configLoader.load();
    return reply.status(configData.valid ? 200 : 422).send(configData);
  });

  // Live validation endpoint for in-browser editor
  fastify.post<{ Body: { content: string; isJson?: boolean } }>('/api/v1/config/validate', async (req, reply) => {
    const { content, isJson } = req.body || { content: '', isJson: false };
    if (typeof content !== 'string') {
      return reply.status(400).send({
        valid: false,
        diagnostics: [{ line: 1, column: 1, message: 'Request body must contain "content" as a string', severity: 'error' }],
      });
    }

    const result = parseConfig(content, Boolean(isJson));
    return reply.status(result.valid ? 200 : 422).send(result);
  });

  // Initial config load & start health checker
  const initialConfig = configLoader.load();
  if (initialConfig.config) {
    globalHealthChecker.start(initialConfig.config);
  }

  // Hook config changes to update health checker
  configLoader.on('changed', (updated) => {
    if (updated.config) {
      globalHealthChecker.updateConfig(updated.config);
    }
  });

  // Static client serving
  const clientDist = path.resolve(process.cwd(), 'dist', 'client');
  if (fs.existsSync(clientDist)) {
    await fastify.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      wildcard: false,
      decorateReply: false,
    });

    fastify.setNotFoundHandler(async (req, reply) => {
      const url = req.url || '';
      if (url.startsWith('/api') || url.startsWith('/icons')) {
        return reply.status(404).send({ error: 'Route not found', statusCode: 404 });
      }
      const indexPath = path.join(clientDist, 'index.html');
      if (fs.existsSync(indexPath)) {
        return reply.type('text/html').send(fs.readFileSync(indexPath, 'utf-8'));
      }
      return reply.status(404).send('Not Found');
    });
  }

  return fastify;
}

async function startServer() {
  await setupServer();
  try {
    await fastify.listen({ port: PORT, host: HOST });
    const elapsed = Date.now() - startTime;
    const memMb = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;

    console.log(`
  ======================================================
  🚀 DashPark v${VERSION} Ready!
  ------------------------------------------------------
  🌐 Local URL:       http://localhost:${PORT}
  📡 API Health:      http://localhost:${PORT}/api/v1/health
  ⚙️  Config Engine:   http://localhost:${PORT}/api/v1/config
  💓 Health Monitor:  http://localhost:${PORT}/api/v1/health/services
  📊 System Stats:    http://localhost:${PORT}/api/v1/system/stats
  🖼️  Icon Proxy:      http://localhost:${PORT}/api/v1/icons/favicon
  ⚡ Startup Time:    ${elapsed}ms
  🧠 Memory Footprint: ${memMb} MB RAM
  ======================================================
    `);
  } catch (err) {
    console.error('[DashPark] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
