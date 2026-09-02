import { describe, it, expect } from 'vitest';
import { detectServiceFromUrl } from '../src/client/editor/presets.js';

describe('Homelab Smart URL Auto-Detector', () => {
  it('should auto-detect Emby from port 8096 without jellyfin keyword', () => {
    const result = detectServiceFromUrl('http://192.168.1.50:8096');
    expect(result).toBeDefined();
    expect(result?.id).toBe('emby');
    expect(result?.name).toBe('Emby Media Server');
  });

  it('should auto-detect Jellyfin from URL containing jellyfin', () => {
    const result = detectServiceFromUrl('http://192.168.1.50:8096/jellyfin');
    expect(result).toBeDefined();
    expect(result?.id).toBe('jellyfin');
    expect(result?.name).toBe('Jellyfin');
  });

  it('should auto-detect Plex from port 32400', () => {
    const result = detectServiceFromUrl('http://192.168.1.100:32400/web');
    expect(result).toBeDefined();
    expect(result?.id).toBe('plex');
  });

  it('should auto-detect Pi-hole from /admin or pi.hole domain', () => {
    const result = detectServiceFromUrl('http://192.168.1.2/admin');
    expect(result).toBeDefined();
    expect(result?.id).toBe('pihole');
  });

  it('should auto-detect Proxmox from port 8006', () => {
    const result = detectServiceFromUrl('https://192.168.1.254:8006');
    expect(result).toBeDefined();
    expect(result?.id).toBe('proxmox');
    expect(result?.widget?.url).toContain(':8006');
  });

  it('should auto-detect Home Assistant from port 8123', () => {
    const result = detectServiceFromUrl('http://192.168.1.5:8123');
    expect(result).toBeDefined();
    expect(result?.id).toBe('homeassistant');
  });

  it('should return null for unknown generic URL', () => {
    const result = detectServiceFromUrl('http://unknown-domain.com:9999');
    expect(result).toBeNull();
  });
});
