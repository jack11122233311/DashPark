import type { FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import { APP_VERSION } from '../../shared/version.js';

export const systemRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/system/stats', async () => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 1000) / 10;

    const processMem = process.memoryUsage();
    const processHeapMb = Math.round((processMem.heapUsed / 1024 / 1024) * 10) / 10;
    const processRssMb = Math.round((processMem.rss / 1024 / 1024) * 10) / 10;

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return {
      timestamp: new Date().toISOString(),
      host: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeSeconds: Math.floor(os.uptime()),
        cpuCount: cpus.length,
        cpuModel: cpus[0]?.model || 'Unknown',
        loadAvg: [
          Math.round(loadAvg[0] * 100) / 100,
          Math.round(loadAvg[1] * 100) / 100,
          Math.round(loadAvg[2] * 100) / 100,
        ],
        memory: {
          totalMb: Math.round(totalMem / 1024 / 1024),
          usedMb: Math.round(usedMem / 1024 / 1024),
          freeMb: Math.round(freeMem / 1024 / 1024),
          usagePercent: memUsagePercent,
        },
      },
      dashpark: {
        version: APP_VERSION,
        uptimeSeconds: Math.floor(process.uptime()),
        heapUsedMb: processHeapMb,
        rssMb: processRssMb,
      },
    };
  });
};
