import { describe, it, expect } from 'vitest';
import { DashParkConfigSchema } from '../src/server/config/schema.js';
import type { DashParkConfig } from '../src/shared/types.js';

describe('Multi-Page Configuration Engine', () => {
  it('should parse multi-page schema with distinct pages and categories', () => {
    const rawMultiPage = {
      version: '0.3.0',
      meta: { title: 'Multi Homelab' },
      pages: [
        {
          id: 'home',
          name: 'Home Overview',
          icon: 'home',
          categories: [
            {
              id: 'core',
              name: 'Core Services',
              services: [
                {
                  id: 'pihole',
                  name: 'Pi-hole',
                  url: 'http://192.168.1.2:8080',
                  target: '_blank',
                  bentoSpan: '2x1',
                },
              ],
            },
          ],
        },
        {
          id: 'media',
          name: 'Media Vault',
          icon: 'film',
          categories: [
            {
              id: 'streaming',
              name: 'Streaming',
              services: [
                {
                  id: 'emby',
                  name: 'Emby',
                  url: 'http://192.168.1.100:8096',
                  target: '_blank',
                  bentoSpan: '2x2',
                },
              ],
            },
          ],
        },
      ],
    };

    const parsed = DashParkConfigSchema.parse(rawMultiPage);
    expect(parsed.pages).toHaveLength(2);
    expect(parsed.pages![0].id).toBe('home');
    expect(parsed.pages![0].categories[0].services[0].bentoSpan).toBe('2x1');
    expect(parsed.pages![1].id).toBe('media');
    expect(parsed.pages![1].categories[0].services[0].bentoSpan).toBe('2x2');
  });

  it('should gracefully normalize legacy single-page root categories into a default page', () => {
    const legacyConfig = {
      version: '0.2.0',
      meta: { title: 'Legacy Lab' },
      categories: [
        {
          id: 'infra',
          name: 'Infrastructure',
          services: [
            {
              id: 'proxmox',
              name: 'Proxmox',
              url: 'https://192.168.1.254:8006',
              target: '_blank',
            },
          ],
        },
      ],
    };

    const parsed = DashParkConfigSchema.parse(legacyConfig);
    expect(parsed.pages).toBeDefined();
    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages![0].id).toBe('home');
    expect(parsed.pages![0].categories).toHaveLength(1);
    expect(parsed.pages![0].categories[0].services[0].id).toBe('proxmox');
    expect(parsed.pages![0].categories[0].services[0].bentoSpan).toBe('1x1'); // Default bento span
  });
});
