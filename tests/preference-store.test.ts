import { describe, it, expect, beforeEach } from 'vitest';
import { PreferenceStore } from '../src/client/state/PreferenceStore.js';

describe('PreferenceStore State Management', () => {
  const storeMap = new Map<string, string>();

  beforeEach(() => {
    storeMap.clear();
    (global as any).localStorage = {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => storeMap.set(k, String(v)),
      removeItem: (k: string) => storeMap.delete(k),
      clear: () => storeMap.clear(),
    };
  });

  it('persists and retrieves layout mode with valid fallbacks', () => {
    expect(PreferenceStore.getLayout('grid')).toBe('grid');
    PreferenceStore.setLayout('bento');
    expect(PreferenceStore.getLayout()).toBe('bento');
    PreferenceStore.setLayout('compact');
    expect(PreferenceStore.getLayout()).toBe('compact');
  });

  it('persists and retrieves theme name safely', () => {
    expect(PreferenceStore.getTheme('dark')).toBe('dark');
    PreferenceStore.setTheme('nord');
    expect(PreferenceStore.getTheme()).toBe('nord');
    PreferenceStore.setTheme('catppuccin');
    expect(PreferenceStore.getTheme()).toBe('catppuccin');
  });

  it('handles category collapse toggling and state sets', () => {
    expect(PreferenceStore.getCollapsedCategories().size).toBe(0);

    const isCollapsed1 = PreferenceStore.toggleCategoryCollapsed('cat-media');
    expect(isCollapsed1).toBe(true);
    expect(PreferenceStore.getCollapsedCategories().has('cat-media')).toBe(true);

    const isCollapsed2 = PreferenceStore.toggleCategoryCollapsed('cat-media');
    expect(isCollapsed2).toBe(false);
    expect(PreferenceStore.getCollapsedCategories().has('cat-media')).toBe(false);
  });
});
