import type { LayoutMode, ThemeName } from '../../shared/types.js';

export interface UserPreferences {
  layout: LayoutMode;
  theme: ThemeName;
  collapsedCategories: string[];
}

export class PreferenceStore {
  private static readonly STORAGE_KEYS = {
    LAYOUT: 'dashpark_layout_mode',
    THEME: 'dashpark_theme',
    COLLAPSED: 'dashpark_collapsed_categories',
  };

  private static isStorageAvailable(): boolean {
    try {
      const testKey = '__dashpark_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public static getLayout(fallback: LayoutMode = 'grid'): LayoutMode {
    if (!this.isStorageAvailable()) return fallback;
    try {
      const val = localStorage.getItem(this.STORAGE_KEYS.LAYOUT) as LayoutMode | null;
      if (val && ['grid', 'bento', 'compact'].includes(val)) {
        return val;
      }
    } catch {
      // Ignore
    }
    return fallback;
  }

  public static setLayout(layout: LayoutMode): void {
    if (!this.isStorageAvailable()) return;
    try {
      localStorage.setItem(this.STORAGE_KEYS.LAYOUT, layout);
    } catch {
      // Ignore
    }
  }

  public static getTheme(fallback: ThemeName = 'dark'): ThemeName {
    if (!this.isStorageAvailable()) return fallback;
    try {
      const val = localStorage.getItem(this.STORAGE_KEYS.THEME) as ThemeName | null;
      if (val && ['dark', 'nord', 'dracula', 'catppuccin', 'cyberpunk', 'glass', 'light'].includes(val)) {
        return val;
      }
    } catch {
      // Ignore
    }
    return fallback;
  }

  public static setTheme(theme: ThemeName): void {
    if (!this.isStorageAvailable()) return;
    try {
      localStorage.setItem(this.STORAGE_KEYS.THEME, theme);
    } catch {
      // Ignore
    }
  }

  public static getCollapsedCategories(): Set<string> {
    if (!this.isStorageAvailable()) return new Set();
    try {
      const val = localStorage.getItem(this.STORAGE_KEYS.COLLAPSED);
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((item) => typeof item === 'string'));
        }
      }
    } catch {
      // Ignore
    }
    return new Set();
  }

  public static setCollapsedCategories(collapsed: Set<string> | string[]): void {
    if (!this.isStorageAvailable()) return;
    try {
      const array = Array.isArray(collapsed) ? collapsed : Array.from(collapsed);
      localStorage.setItem(this.STORAGE_KEYS.COLLAPSED, JSON.stringify(array));
    } catch {
      // Ignore
    }
  }

  public static toggleCategoryCollapsed(categoryId: string): boolean {
    const current = this.getCollapsedCategories();
    let isNowCollapsed = false;
    if (current.has(categoryId)) {
      current.delete(categoryId);
      isNowCollapsed = false;
    } else {
      current.add(categoryId);
      isNowCollapsed = true;
    }
    this.setCollapsedCategories(current);
    return isNowCollapsed;
  }
}
