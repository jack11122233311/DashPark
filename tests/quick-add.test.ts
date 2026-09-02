import { describe, it, expect } from 'vitest';
import { QuickAddModal } from '../src/client/quickadd/QuickAddModal.js';

describe('QuickAddModal Component', () => {
  it('identifies homelab ports and services accurately via smart URL detector', () => {
    (global as any).document = {
      getElementById: () => null,
      createElement: () => ({ id: '', className: '', appendChild: () => {} }),
      body: { appendChild: () => {} },
    };

    const modal = new QuickAddModal({
      getConfig: () => null,
      onServiceAdded: async () => {},
    });

    // Jellyfin
    const jellyfin = modal.detectServiceFromUrl('http://192.168.1.100:8096');
    expect(jellyfin.name).toBe('Jellyfin');
    expect(jellyfin.icon).toBe('jellyfin');

    // Plex
    const plex = modal.detectServiceFromUrl('http://10.0.0.5:32400/web');
    expect(plex.name).toBe('Plex');
    expect(plex.icon).toBe('plex');

    // Sonarr
    const sonarr = modal.detectServiceFromUrl('http://192.168.1.50:8989');
    expect(sonarr.name).toBe('Sonarr');
    expect(sonarr.icon).toBe('sonarr');

    // Proxmox
    const pve = modal.detectServiceFromUrl('https://192.168.1.2:8006');
    expect(pve.name).toBe('Proxmox VE');
    expect(pve.icon).toBe('proxmox');

    // Home Assistant
    const hass = modal.detectServiceFromUrl('http://homeassistant.local:8123');
    expect(hass.name).toBe('Home Assistant');
    expect(hass.icon).toBe('homeassistant');

    // Custom hostname fallback
    const custom = modal.detectServiceFromUrl('https://router.lan');
    expect(custom.name).toBe('Router');
  });
});
