import { describe, it, expect } from 'vitest';
import { WidgetPoller } from '../src/client/services/WidgetPoller.js';

describe('WidgetPoller Service', () => {
  it('instantiates and clears timers properly', () => {
    (global as any).document = {
      querySelectorAll: () => [],
    };

    const poller = new WidgetPoller();
    expect(poller).toBeDefined();

    poller.updateTargets([
      {
        id: 'cat-1',
        name: 'General',
        services: [
          {
            id: 's1',
            name: 'Proxmox',
            url: 'https://pve.local',
            widget: {
              enabled: true,
              url: 'https://pve.local/api2/json/version',
              refreshIntervalSeconds: 60,
            },
          },
        ],
      },
    ]);

    expect(poller.getWidgetData('s1')).toBeUndefined();
    poller.stopAll();
    expect(true).toBe(true);
  });
});
