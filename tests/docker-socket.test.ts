import { describe, it, expect } from 'vitest';
import { DockerSocketService } from '../src/server/services/docker-socket.js';

describe('Docker Socket Auto-Discovery & Service', () => {
  it('should correctly parse Docker container labels for DashPark taxonomy', () => {
    const rawContainer = {
      Id: 'c1234567890abcdef',
      Names: ['/plex_media_server'],
      Image: 'linuxserver/plex:latest',
      State: 'running',
      Status: 'Up 4 hours',
      Created: 1700000000,
      Labels: {
        'dashpark.enable': 'true',
        'dashpark.name': 'Plex Media Server',
        'dashpark.group': 'Media & Entertainment',
        'dashpark.icon': 'plex',
        'dashpark.url': 'http://192.168.1.100:32400',
        'dashpark.widget.type': 'stat',
      },
      Ports: [
        { IP: '0.0.0.0', PrivatePort: 32400, PublicPort: 32400, Type: 'tcp' }
      ]
    };

    const parsed = DockerSocketService.formatContainer(rawContainer);
    expect(parsed.id).toBe('c1234567890abcdef');
    expect(parsed.name).toBe('Plex Media Server');
    expect(parsed.state).toBe('running');
    expect(parsed.dashParkMeta.enabled).toBe(true);
    expect(parsed.dashParkMeta.name).toBe('Plex Media Server');
    expect(parsed.dashParkMeta.group).toBe('Media & Entertainment');
    expect(parsed.dashParkMeta.icon).toBe('plex');
    expect(parsed.dashParkMeta.url).toBe('http://192.168.1.100:32400');
    expect(parsed.ports).toEqual(['0.0.0.0:32400->32400/tcp']);
  });

  it('should extract fallback name and default values when labels are absent', () => {
    const rawContainer = {
      Id: 'd9876543210fedcba',
      Names: ['/unlabeled_vaultwarden'],
      Image: 'vaultwarden/server:latest',
      State: 'exited',
      Status: 'Exited (0) 10 minutes ago',
      Created: 1700000000,
      Labels: {},
      Ports: []
    };

    const parsed = DockerSocketService.formatContainer(rawContainer);
    expect(parsed.name).toBe('unlabeled_vaultwarden');
    expect(parsed.state).toBe('exited');
    expect(parsed.dashParkMeta.enabled).toBe(false);
    expect(parsed.dashParkMeta.name).toBe('unlabeled_vaultwarden');
    expect(parsed.dashParkMeta.group).toBe('Docker Services');
    expect(parsed.dashParkMeta.icon).toBe('docker');
  });
});
