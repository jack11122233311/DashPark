import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandPalette } from '../src/client/command/CommandPalette.js';
import type { DashParkConfig } from '../src/shared/types.js';

class MockElement {
  public tagName: string;
  public id: string = '';
  public value: string = '';
  public innerHTML: string = '';
  public textContent: string = '';
  public open: boolean = false;
  private listeners: Record<string, Function[]> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  public addEventListener(event: string, fn: Function): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  public showModal(): void {
    this.open = true;
  }

  public close(): void {
    this.open = false;
  }

  public focus(): void {}

  public dispatchEvent(event: { key: string }): void {
    (this.listeners['keydown'] || []).forEach((fn) => fn({ ...event, preventDefault: () => {} }));
  }

  public querySelectorAll(_sel: string): any[] {
    return [];
  }

  public querySelector(_sel: string): any {
    return null;
  }
}

describe('CommandPalette Spotlight Component', () => {
  let mockDialog: MockElement;
  let mockInput: MockElement;
  let mockResults: MockElement;
  let mockConfig: DashParkConfig;

  beforeEach(() => {
    mockDialog = new MockElement('dialog');
    mockDialog.id = 'command-palette-dialog';

    mockInput = new MockElement('input');
    mockInput.id = 'command-palette-input';

    mockResults = new MockElement('div');
    mockResults.id = 'command-palette-results';

    (globalThis as any).document = {
      getElementById: (id: string) => {
        if (id === 'command-palette-dialog') return mockDialog;
        if (id === 'command-palette-input') return mockInput;
        if (id === 'command-palette-results') return mockResults;
        return null;
      },
      createElement: () => new MockElement('div'),
    };

    mockConfig = {
      meta: {
        title: 'Homelab',
        theme: 'dark',
        layout: 'grid',
      },
      pages: [
        {
          id: 'home',
          name: 'Home',
          icon: 'home',
          categories: [
            {
              id: 'media',
              name: 'Media',
              icon: 'tv',
              services: [
                {
                  id: 'plex',
                  name: 'Plex Media Server',
                  url: 'http://localhost:32400',
                  target: '_blank',
                  tags: ['streaming', 'movies'],
                  shortcuts: [{ name: 'Web Client', url: 'http://localhost:32400/web' }],
                },
              ],
            },
          ],
        },
      ],
    };
  });

  it('should open and populate spotlight results with services, layouts, themes, and actions', () => {
    const palette = new CommandPalette({
      getConfig: () => mockConfig,
      onLayoutSelect: vi.fn(),
      onThemeSelect: vi.fn(),
      onOpenSettings: vi.fn(),
      onPageSelect: vi.fn(),
      onToggleBentoCustomize: vi.fn(),
    });

    palette.open();
    expect(palette.isOpen()).toBe(true);
    expect(mockResults.innerHTML).toContain('Plex Media Server');
    expect(mockResults.innerHTML).toContain('Categorized Grid Layout');
    expect(mockResults.innerHTML).toContain('Dark Theme');
    expect(mockResults.innerHTML).toContain('Open Settings Hub');
  });

  it('should filter items accurately based on search query', () => {
    const palette = new CommandPalette({
      getConfig: () => mockConfig,
      onLayoutSelect: vi.fn(),
      onThemeSelect: vi.fn(),
      onOpenSettings: vi.fn(),
      onPageSelect: vi.fn(),
      onToggleBentoCustomize: vi.fn(),
    });

    palette.open();
    palette.filter('plex');
    expect(mockResults.innerHTML).toContain('Plex Media Server');

    palette.filter('non-existent-keyword-xyz');
    expect(mockResults.innerHTML).toContain('No matching commands or services found');
  });

  it('should execute action and close when selecting an item', () => {
    const onThemeSelect = vi.fn();
    const palette = new CommandPalette({
      getConfig: () => mockConfig,
      onLayoutSelect: vi.fn(),
      onThemeSelect,
      onOpenSettings: vi.fn(),
      onPageSelect: vi.fn(),
      onToggleBentoCustomize: vi.fn(),
    });

    palette.open();
    palette.filter('dracula');

    mockInput.dispatchEvent({ key: 'Enter' });
    expect(onThemeSelect).toHaveBeenCalledWith('dracula');
    expect(palette.isOpen()).toBe(false);
  });
});
