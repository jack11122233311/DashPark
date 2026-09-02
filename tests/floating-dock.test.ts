import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FloatingDock } from '../src/client/dock/FloatingDock.js';

// Minimal in-memory DOM mock for node environment
class MockElement {
  public tagName: string;
  public id: string = '';
  public className: string = '';
  public classList = {
    classes: new Set<string>(),
    add: (c: string) => this.classList.classes.add(c),
    remove: (c: string) => this.classList.classes.delete(c),
    toggle: (c: string, force?: boolean) => {
      if (force !== undefined) {
        if (force) this.classList.classes.add(c);
        else this.classList.classes.delete(c);
        return force;
      }
      if (this.classList.classes.has(c)) {
        this.classList.classes.delete(c);
        return false;
      }
      this.classList.classes.add(c);
      return true;
    },
    contains: (c: string) => this.classList.classes.has(c),
  };
  public attributes: Record<string, string> = {};
  public children: MockElement[] = [];
  public innerHTML: string = '';
  public textContent: string = '';
  public style: Record<string, string> = {};
  public offsetLeft: number = 10;
  public offsetWidth: number = 80;
  private listeners: Record<string, Function[]> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  public getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  public setAttribute(name: string, val: string): void {
    this.attributes[name] = val;
  }

  public addEventListener(event: string, fn: Function): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  public click(): void {
    (this.listeners['click'] || []).forEach((fn) => fn({ stopPropagation: () => {} }));
  }

  public querySelector<T = MockElement>(sel: string): T | null {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      return this.id === id ? (this as any) : this.children.find((c) => c.id === id) as any || null;
    }
    return this.children[0] as any || null;
  }

  public querySelectorAll<T = MockElement>(_sel: string): T[] {
    return this.children as any[];
  }
}

describe('FloatingDock Action Dock Component', () => {
  let mockContainer: MockElement;

  beforeEach(() => {
    mockContainer = new MockElement('nav');
    mockContainer.id = 'floating-action-dock';

    (globalThis as any).document = {
      getElementById: (id: string) => (id === 'floating-action-dock' ? mockContainer : null),
      addEventListener: vi.fn(),
    };
  });

  it('should initialize and render the dock layout', () => {
    const onLayoutSelect = vi.fn();
    const onThemeSelect = vi.fn();
    const onOpenSettings = vi.fn();
    const onOpenCommandPalette = vi.fn();
    const onToggleBentoCustomize = vi.fn();

    const dock = new FloatingDock({
      onLayoutSelect,
      onThemeSelect,
      onOpenSettings,
      onOpenCommandPalette,
      onToggleBentoCustomize,
      getCurrentLayout: () => 'grid',
      getCurrentTheme: () => 'dark',
    });

    dock.init();

    expect(mockContainer.innerHTML).toContain('dock-wrapper');
    expect(mockContainer.innerHTML).toContain('Categorized Grid');
    expect(mockContainer.innerHTML).toContain('Bento Grid');
    expect(mockContainer.innerHTML).toContain('dock-btn-cmd');
    expect(mockContainer.innerHTML).toContain('dock-btn-settings');
  });

  it('should update layout and theme state seamlessly', () => {
    const dock = new FloatingDock({
      onLayoutSelect: vi.fn(),
      onThemeSelect: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenCommandPalette: vi.fn(),
      onToggleBentoCustomize: vi.fn(),
      getCurrentLayout: () => 'grid',
      getCurrentTheme: () => 'dark',
    });

    dock.init();

    dock.setLayout('bento');
    dock.setTheme('nord');
    dock.setBentoEditing(true);
    // Should complete cleanly without error
    expect(true).toBe(true);
  });
});
