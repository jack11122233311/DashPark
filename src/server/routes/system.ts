import type { FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import fs from 'node:fs';
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

    // Estimate CPU usage percent across cores
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsagePercent = totalTick > 0 ? Math.round((1 - totalIdle / totalTick) * 1000) / 10 : 0;

    // Disk space via fs.statfsSync
    let diskStats = {
      totalGb: 0,
      usedGb: 0,
      freeGb: 0,
      usagePercent: 0,
      mountPath: os.platform() === 'win32' ? process.cwd().slice(0, 3) : '/',
    };

    try {
      if (typeof fs.statfsSync === 'function') {
        const rootPath = os.platform() === 'win32' ? process.cwd() : '/';
        const stat = fs.statfsSync(rootPath);
        const totalBytes = stat.blocks * stat.bsize;
        const freeBytes = stat.bavail * stat.bsize;
        const usedBytes = totalBytes - freeBytes;

        diskStats = {
          totalGb: Math.round((totalBytes / 1024 / 1024 / 1024) * 10) / 10,
          usedGb: Math.round((usedBytes / 1024 / 1024 / 1024) * 10) / 10,
          freeGb: Math.round((freeBytes / 1024 / 1024 / 1024) * 10) / 10,
          usagePercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0,
          mountPath: rootPath,
        };
      }
    } catch {
      // Graceful fallback on restricted permissions
    }

    return {
      timestamp: new Date().toISOString(),
      host: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeSeconds: Math.floor(os.uptime()),
        cpuCount: cpus.length,
        cpuModel: cpus[0]?.model || 'Unknown',
        cpuUsagePercent,
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
        disk: diskStats,
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
