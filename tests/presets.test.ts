import { describe, it, expect } from 'vitest';
import { HOMELAB_PRESETS } from '../src/client/editor/presets.js';

describe('Homelab Presets Catalog Integrity', () => {
  it('should provide all 11 core homelab presets', () => {
    expect(HOMELAB_PRESETS.length).toBeGreaterThanOrEqual(10);
    const ids = HOMELAB_PRESETS.map((p) => p.id);
    expect(ids).toContain('emby');
    expect(ids).toContain('jellyfin');
    expect(ids).toContain('pihole');
    expect(ids).toContain('adguard');
    expect(ids).toContain('sonarr');
    expect(ids).toContain('radarr');
    expect(ids).toContain('homeassistant');
    expect(ids).toContain('proxmox');
    expect(ids).toContain('truenas');
    expect(ids).toContain('uptimekuma');
    expect(ids).toContain('speedtest');
  });

  it('each preset should have valid metadata, guide, and shortcuts', () => {
    HOMELAB_PRESETS.forEach((preset) => {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.category).toBeTruthy();
      expect(preset.icon).toBeTruthy();
      expect(preset.urlPlaceholder).toBeTruthy();
      expect(preset.defaultPingUrl).toBeTruthy();
      expect(preset.guide).toBeDefined();
      expect(preset.guide.title).toBeTruthy();
      expect(preset.guide.tokenInstructions).toBeTruthy();

      if (preset.shortcuts) {
        preset.shortcuts.forEach((sc) => {
          expect(sc.name).toBeTruthy();
          expect(sc.url).toBeTruthy();
        });
      }
    });
  });
});
