import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchEngineBar } from '../src/client/search/SearchEngineBar.js';

describe('Search Target & Multi-Screen Window Management', () => {
  beforeEach(() => {
    (global as any).localStorage = {
      store: {} as Record<string, string>,
      getItem(key: string) { return this.store[key] || null; },
      setItem(key: string, val: string) { this.store[key] = String(val); },
      removeItem(key: string) { delete this.store[key]; },
      clear() { this.store = {}; },
    };

    (global as any).document = {
      querySelector: () => null,
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ appendChild: () => {}, querySelectorAll: () => [] }),
    };

    (global as any).window = {
      open: vi.fn(),
      location: { assign: vi.fn(), href: '' },
      screen: {
        availLeft: 0,
        availTop: 0,
        availWidth: 1920,
        availHeight: 1080,
      },
    };
  });

  it('defaults to new_tab and dispatches window.open with noopener', async () => {
    const bar = new SearchEngineBar();
    expect(bar.getTargetMode()).toBe('new_tab');
    expect(bar.getTargetScreen()).toBe(0);

    await bar.executeSearch('homelab dashboard');

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('google.com/search?q=homelab%20dashboard'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('dispatches window.location.assign when targetMode is same_tab', async () => {
    const bar = new SearchEngineBar();
    bar.setTargetOptions({ target: 'same_tab' });
    expect(bar.getTargetMode()).toBe('same_tab');

    await bar.executeSearch('truenas scale');

    expect(window.location.assign).toHaveBeenCalledWith(
      expect.stringContaining('google.com/search?q=truenas%20scale')
    );
  });

  it('computes centered coordinates when targetMode is new_window', async () => {
    const bar = new SearchEngineBar();
    bar.setTargetOptions({
      target: 'new_window',
      windowWidth: 1200,
      windowHeight: 800,
    });

    await bar.executeSearch('proxmox ve');

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('google.com/search?q=proxmox%20ve'),
      '_blank',
      expect.stringContaining('popup=yes,width=1200,height=800,left=360,top=140')
    );
  });

  it('calculates screen offset for secondary display in target_screen mode', async () => {
    const bar = new SearchEngineBar();
    bar.setTargetOptions({
      target: 'target_screen',
      targetScreen: 1, // Screen 2
      windowWidth: 1400,
      windowHeight: 900,
    });

    await bar.executeSearch('docker compose');

    // Expected left = availLeft (0) + (1 * 1920) = 1920
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('google.com/search?q=docker%20compose'),
      '_blank',
      expect.stringContaining('popup=yes,width=1400,height=900,left=1920,top=0')
    );
  });

  it('gracefully triggers onPopupBlocked fallback when popup is blocked', async () => {
    (window.open as any).mockReturnValue(null); // Simulate popup blocked
    const onPopupBlocked = vi.fn();

    const bar = new SearchEngineBar({ onPopupBlocked });
    bar.setTargetOptions({ target: 'new_window' });

    await bar.executeSearch('jellyfin hardware transcoding');

    expect(onPopupBlocked).toHaveBeenCalledWith(
      expect.stringContaining('google.com/search?q=jellyfin%20hardware%20transcoding')
    );
  });
});
