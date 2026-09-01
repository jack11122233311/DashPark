import { describe, it, expect } from 'vitest';
import { HealthCheckerService } from '../src/server/services/health-checker.js';

describe('DashPark HealthCheckerService', () => {
  it('should compute online/degraded status correctly for reachable URLs', async () => {
    const checker = new HealthCheckerService(10000);
    // Ping a reliable test endpoint or mock URL
    const result = await checker.pingUrl('https://www.google.com', 4000);

    expect(result.status).toBe('online');
    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.statusCode).toBeDefined();
  });

  it('should mark invalid/unreachable endpoints as offline gracefully without throwing', async () => {
    const checker = new HealthCheckerService(10000);
    const result = await checker.pingUrl('http://192.0.2.1:9999/nonexistent', 1000); // Test RFC 5737 TEST-NET-1 IP that will time out

    expect(result.status).toBe('offline');
    expect(result.error).toBeDefined();
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('should store and retrieve status entries in statusMap', async () => {
    const checker = new HealthCheckerService(10000);
    const service = {
      id: 'test-service',
      name: 'Google Test',
      url: 'https://www.google.com',
    };

    const health = await checker.checkService(service);
    expect(health.serviceId).toBe('test-service');
    expect(checker.getStatus('test-service')).toBeDefined();
    expect(checker.getAllStatuses()['test-service']).toBeDefined();
  });
});
