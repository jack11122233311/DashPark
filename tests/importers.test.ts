import { describe, it, expect } from 'vitest';
import { detectAndImportConfig } from '../src/client/editor/importers.js';

describe('Multi-Dashboard Importer (Homepage, Homarr, Dashy, Heimdall)', () => {
  it('should import Homepage YAML format (services.yaml)', () => {
    const homepageYaml = `
- Media:
    - Plex:
        icon: plex.png
        href: http://192.168.1.10:32400
        description: Home Cinema Server
    - Jellyfin:
        icon: jellyfin.png
        href: http://192.168.1.11:8096
- Management:
    - Portainer:
        icon: portainer.png
        href: https://192.168.1.5:9443
`;

    const result = detectAndImportConfig(homepageYaml);
    expect(result.success).toBe(true);
    expect(result.detectedFormat).toBe('homepage');
    expect(result.totalServices).toBe(3);
    expect(result.categories.length).toBe(2);

    const mediaCat = result.categories.find((c) => c.name === 'Media');
    expect(mediaCat).toBeDefined();
    expect(mediaCat?.services.length).toBe(2);
    expect(mediaCat?.services[0].name).toBe('Plex');
    expect(mediaCat?.services[0].url).toBe('http://192.168.1.10:32400');
    expect(mediaCat?.services[0].icon).toBe('plex');
  });

  it('should import Homarr JSON format', () => {
    const homarrJson = JSON.stringify({
      wrappers: [
        {
          id: 'wrap-1',
          position: 0,
          gridItems: [
            {
              id: 'item-1',
              item: {
                id: 'sub-1',
                name: 'Proxmox VE',
                url: 'https://192.168.1.200:8006',
                iconUrl: 'proxmox.png',
                category: 'Infrastructure',
              },
            },
            {
              id: 'item-2',
              item: {
                id: 'sub-2',
                name: 'Pi-hole DNS',
                url: 'http://192.168.1.2:80',
                category: 'Network',
              },
            },
          ],
        },
      ],
    });

    const result = detectAndImportConfig(homarrJson);
    expect(result.success).toBe(true);
    expect(result.detectedFormat).toBe('homarr');
    expect(result.totalServices).toBe(2);
    expect(result.categories.length).toBe(2);
  });

  it('should import Dashy YAML format (conf.yml)', () => {
    const dashyYaml = `
pageInfo:
  title: My Dashy Homelab
sections:
  - name: Storage & Cloud
    icon: fas fa-hdd
    items:
      - title: Nextcloud
        description: Private cloud storage
        url: https://cloud.local
        icon: nextcloud.png
      - title: TrueNAS
        url: https://nas.local
`;

    const result = detectAndImportConfig(dashyYaml);
    expect(result.success).toBe(true);
    expect(result.detectedFormat).toBe('dashy');
    expect(result.totalServices).toBe(2);
    expect(result.categories[0].name).toBe('Storage & Cloud');
    expect(result.categories[0].services[0].name).toBe('Nextcloud');
  });

  it('should import Heimdall export JSON format', () => {
    const heimdallJson = JSON.stringify({
      apps: [
        {
          title: 'AdGuard Home',
          url: 'http://192.168.1.3:3000',
          description: 'Network-wide ad blocker',
          icon: 'adguard.png',
        },
      ],
    });

    const result = detectAndImportConfig(heimdallJson);
    expect(result.success).toBe(true);
    expect(result.detectedFormat).toBe('heimdall');
    expect(result.totalServices).toBe(1);
    expect(result.categories[0].services[0].name).toBe('AdGuard Home');
  });
});
