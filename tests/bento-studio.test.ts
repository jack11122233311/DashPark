import { describe, it, expect, vi } from 'vitest';
import { BentoStudio } from '../src/client/bento/BentoStudio.js';
import type { ServiceItem } from '../src/shared/types.js';

describe('BentoStudio Drag-and-Drop & Sizing Engine', () => {
  it('should toggle edit mode correctly', () => {
    const onLayoutChanged = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const studio = new BentoStudio(onLayoutChanged, onSave);

    expect(studio.isEditMode).toBe(false);
    expect(studio.toggleEditMode()).toBe(true);
    expect(studio.isEditMode).toBe(true);
    expect(studio.toggleEditMode()).toBe(false);
    expect(studio.isEditMode).toBe(false);
  });

  it('should cycle tile spans through 1x1 -> 2x1 -> 2x2 -> 1x1', () => {
    const studio = new BentoStudio(vi.fn(), vi.fn().mockResolvedValue(undefined));
    const service: ServiceItem = {
      id: 'emby',
      name: 'Emby',
      url: 'http://localhost:8096',
      target: '_blank',
      bentoSpan: '1x1',
    };

    expect(studio.cycleTileSpan(service)).toBe('2x1');
    expect(service.bentoSpan).toBe('2x1');

    expect(studio.cycleTileSpan(service)).toBe('2x2');
    expect(service.bentoSpan).toBe('2x2');

    expect(studio.cycleTileSpan(service)).toBe('1x1');
    expect(service.bentoSpan).toBe('1x1');
  });

  it('should cycle telemetry mode through Graph+Stat -> Stat Only -> Disabled -> Graph+Stat', () => {
    const studio = new BentoStudio(vi.fn(), vi.fn().mockResolvedValue(undefined));
    const service: ServiceItem = {
      id: 'pihole',
      name: 'Pi-hole',
      url: 'http://localhost:8080',
      target: '_blank',
      widget: {
        type: 'stat',
        enabled: true,
        showGraph: true,
      },
    };

    expect(studio.cycleTelemetryMode(service)).toBe('Stat Only');
    expect(service.widget?.showGraph).toBe(false);
    expect(service.widget?.enabled).toBe(true);

    expect(studio.cycleTelemetryMode(service)).toBe('Disabled');
    expect(service.widget?.enabled).toBe(false);

    expect(studio.cycleTelemetryMode(service)).toBe('Graph + Stat');
    expect(service.widget?.enabled).toBe(true);
    expect(service.widget?.showGraph).toBe(true);
  });
});
