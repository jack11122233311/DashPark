import { describe, it, expect } from 'vitest';
import { extractJsonPath } from '../src/server/routes/widgets.js';
import { HealthCheckerService } from '../src/server/services/health-checker.js';

describe('DashPark Widget Proxy & JsonPath Extraction', () => {
  it('should extract top-level keys correctly', () => {
    const payload = {
      ads_blocked_today: 14230,
      dns_queries_today: 95412,
    };

    expect(extractJsonPath(payload, 'ads_blocked_today')).toBe(14230);
    expect(extractJsonPath(payload, 'dns_queries_today')).toBe(95412);
  });

  it('should extract nested object dot notation', () => {
    const payload = {
      System: {
        Info: {
          ServerName: 'Emby-Homelab-Tower',
          ActiveStreams: 3,
        },
      },
    };

    expect(extractJsonPath(payload, 'System.Info.ServerName')).toBe('Emby-Homelab-Tower');
    expect(extractJsonPath(payload, 'System.Info.ActiveStreams')).toBe(3);
  });

  it('should extract array index paths', () => {
    const payload = {
      data: {
        nodes: [
          { id: 'pve-node-01', cpu: 0.14 },
          { id: 'pve-node-02', cpu: 0.42 },
        ],
      },
    };

    expect(extractJsonPath(payload, 'data.nodes[0].id')).toBe('pve-node-01');
    expect(extractJsonPath(payload, 'data.nodes[1].cpu')).toBe(0.42);
  });

  it('should return undefined gracefully for missing paths without crashing', () => {
    const payload = { test: 123 };
    expect(extractJsonPath(payload, 'nonexistent.deep.key')).toBeUndefined();
    expect(extractJsonPath(null, 'test')).toBeUndefined();
  });
});

describe('DashPark HealthChecker SSL & Redirect Engine', () => {
  it('should instantiate and configure without throwing', () => {
    const checker = new HealthCheckerService(15000);
    expect(checker).toBeDefined();
    expect(typeof checker.pingUrl).toBe('function');
  });
});
