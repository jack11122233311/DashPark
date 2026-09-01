import { describe, it, expect } from 'vitest';
import { DashParkConfigSchema, ServiceItemSchema } from '../src/server/config/schema.js';

describe('Service Shortcuts & View-Adaptive Schema Validation', () => {
  it('should parse valid service shortcuts correctly', () => {
    const rawService = {
      id: 'emby',
      name: 'Emby Server',
      url: 'http://192.168.1.50:8096',
      shortcuts: [
        { name: 'Dashboard', url: 'http://192.168.1.50:8096/web/index.html#!/dashboard' },
        { name: 'Live TV', url: 'http://192.168.1.50:8096/web/index.html#!/livetv' },
      ],
    };

    const parsed = ServiceItemSchema.parse(rawService);
    expect(parsed.shortcuts).toBeDefined();
    expect(parsed.shortcuts?.length).toBe(2);
    expect(parsed.shortcuts?.[0].name).toBe('Dashboard');
    expect(parsed.shortcuts?.[1].name).toBe('Live TV');
  });

  it('should default shortcuts to empty array if omitted', () => {
    const rawService = {
      id: 'pihole',
      name: 'Pi-hole',
      url: 'http://192.168.1.2/admin',
    };

    const parsed = ServiceItemSchema.parse(rawService);
    expect(parsed.shortcuts).toEqual([]);
  });

  it('should parse view-adaptive showGraph and enabled widget fields', () => {
    const rawService = {
      id: 'jellyfin',
      name: 'Jellyfin',
      url: 'http://192.168.1.100:8096',
      widget: {
        enabled: true,
        type: 'stat',
        url: 'http://192.168.1.100:8096/Sessions',
        jsonPath: 'length',
        label: 'Streams',
        showGraph: true,
      },
    };

    const parsed = ServiceItemSchema.parse(rawService);
    expect(parsed.widget?.enabled).toBe(true);
    expect(parsed.widget?.showGraph).toBe(true);
  });

  it('should parse full config with shortcuts and widgets without error', () => {
    const fullConfig = {
      version: '0.2.0',
      meta: {
        title: 'Homelab',
        theme: 'dark',
        layout: 'grid',
        showClock: true,
      },
      categories: [
        {
          id: 'media',
          name: 'Media',
          services: [
            {
              id: 'emby',
              name: 'Emby Media Server',
              url: 'http://host.docker.internal:8096',
              widget: {
                enabled: true,
                type: 'stat',
                url: 'http://host.docker.internal:8096/System/Info/Public',
                jsonPath: 'ServerName',
                showGraph: true,
              },
              shortcuts: [
                { name: 'Dashboard', url: 'http://host.docker.internal:8096/web' },
              ],
            },
          ],
        },
      ],
    };

    const parsed = DashParkConfigSchema.parse(fullConfig);
    expect(parsed.categories[0].services[0].shortcuts?.length).toBe(1);
    expect(parsed.categories[0].services[0].widget?.showGraph).toBe(true);
  });
});
