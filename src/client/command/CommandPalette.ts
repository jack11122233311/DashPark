import type { DashParkConfig, ThemeName, LayoutMode } from '../../shared/types.js';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Services' | 'Shortcuts' | 'Pages' | 'Layouts' | 'Themes' | 'Actions';
  icon?: string;
  keywords?: string[];
  action: () => void;
}

export interface CommandPaletteOptions {
  getConfig: () => DashParkConfig | null;
  onLayoutSelect: (layout: LayoutMode) => void;
  onThemeSelect: (theme: ThemeName) => void;
  onOpenSettings: () => void;
  onPageSelect: (pageId: string) => void;
  onToggleBentoCustomize: () => void;
  onQuickAdd?: () => void;
  onToggleKiosk?: () => void;
  onOpenCheatsheet?: () => void;
}

export class CommandPalette {
  private dialog: HTMLDialogElement | null = null;
  private input: HTMLInputElement | null = null;
  private resultsList: HTMLElement | null = null;
  private options: CommandPaletteOptions;
  private items: CommandItem[] = [];
  private filteredItems: CommandItem[] = [];
  private selectedIndex: number = 0;

  constructor(options: CommandPaletteOptions) {
    this.options = options;
    this.init();
  }

  public init(): void {
    this.dialog = document.getElementById('command-palette-dialog') as HTMLDialogElement | null;
    this.input = document.getElementById('command-palette-input') as HTMLInputElement | null;
    this.resultsList = document.getElementById('command-palette-results');

    if (!this.dialog || !this.input) return;

    this.input.addEventListener('input', () => {
      this.filter(this.input?.value || '');
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigate(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigate(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeCurrent();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    // Close on backdrop click
    this.dialog.addEventListener('click', (e) => {
      const rect = this.dialog?.getBoundingClientRect();
      if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
        this.close();
      }
    });
  }

  public rebuildIndex(): void {
    const config = this.options.getConfig();
    const items: CommandItem[] = [];

    // 1. Pages
    if (config?.pages && config.pages.length > 0) {
      config.pages.forEach((page) => {
        items.push({
          id: `page-${page.id}`,
          title: `Go to ${page.name} Page`,
          subtitle: page.description || `Switch to ${page.name} dashboard tab`,
          category: 'Pages',
          icon: page.icon || 'folder',
          keywords: [page.name.toLowerCase(), page.id],
          action: () => {
            this.options.onPageSelect(page.id);
            window.location.hash = `page=${page.id}`;
          },
        });
      });
    }

    // 2. Services and Shortcuts
    const allCategories = config?.pages
      ? config.pages.flatMap((p) => p.categories || [])
      : config?.categories || [];

    allCategories.forEach((cat) => {
      cat.services.forEach((svc) => {
        // Service
        items.push({
          id: `svc-${svc.id}`,
          title: svc.name,
          subtitle: `${cat.name} • ${svc.url}`,
          category: 'Services',
          icon: svc.icon || 'server',
          keywords: [svc.name.toLowerCase(), ...(svc.tags || []).map((t) => t.toLowerCase()), svc.url.toLowerCase()],
          action: () => {
            window.open(svc.url, svc.target || '_blank');
          },
        });

        // Nested Shortcuts
        (svc.shortcuts || []).forEach((sc, scIdx) => {
          items.push({
            id: `sc-${svc.id}-${scIdx}`,
            title: `${svc.name} ➔ ${sc.name}`,
            subtitle: sc.url,
            category: 'Shortcuts',
            icon: 'external-link',
            keywords: [svc.name.toLowerCase(), sc.name.toLowerCase(), sc.url.toLowerCase()],
            action: () => {
              window.open(sc.url, sc.target || '_blank');
            },
          });
        });
      });
    });

    // 3. Layouts
    const layouts: Array<{ id: LayoutMode; name: string; desc: string }> = [
      { id: 'grid', name: 'Categorized Grid Layout', desc: 'Standard categorized cards view' },
      { id: 'bento', name: 'Bento Grid Layout', desc: 'Dynamic visual tiles with sparklines and metric cards' },
      { id: 'compact', name: 'Compact List Layout', desc: 'High-density tabular list for fast monitoring' },
    ];
    layouts.forEach((l) => {
      items.push({
        id: `layout-${l.id}`,
        title: `Switch to ${l.name}`,
        subtitle: l.desc,
        category: 'Layouts',
        icon: 'layout',
        keywords: ['layout', l.id, l.name.toLowerCase()],
        action: () => this.options.onLayoutSelect(l.id),
      });
    });

    // 4. Themes
    const themes: Array<{ id: ThemeName; name: string; emoji: string }> = [
      { id: 'dark', name: 'Dark Theme', emoji: '🌙' },
      { id: 'nord', name: 'Nord Theme', emoji: '❄️' },
      { id: 'dracula', name: 'Dracula Theme', emoji: '🧛' },
      { id: 'catppuccin', name: 'Catppuccin Theme', emoji: '🐱' },
      { id: 'cyberpunk', name: 'Cyberpunk Theme', emoji: '⚡' },
      { id: 'glass', name: 'Glass Theme', emoji: '💎' },
      { id: 'light', name: 'Light Theme', emoji: '☀️' },
    ];
    themes.forEach((t) => {
      items.push({
        id: `theme-${t.id}`,
        title: `${t.emoji} ${t.name}`,
        subtitle: `Set dashboard color palette to ${t.name}`,
        category: 'Themes',
        icon: 'palette',
        keywords: ['theme', t.id, t.name.toLowerCase()],
        action: () => this.options.onThemeSelect(t.id),
      });
    });

    // 5. System Actions
    items.push(
      {
        id: 'act-quickadd',
        title: '➕ Quick Add Service',
        subtitle: 'Fast URL & IP port scanner to add new homelab service',
        category: 'Actions',
        icon: 'plus',
        keywords: ['add', 'service', 'create', 'new', 'port', 'ip'],
        action: () => this.options.onQuickAdd?.(),
      },
      {
        id: 'act-kiosk',
        title: '📺 Toggle Kiosk Wallboard Mode',
        subtitle: 'Auto-rotating slideshow across dashboard pages with timer',
        category: 'Actions',
        icon: 'play',
        keywords: ['kiosk', 'slideshow', 'wallboard', 'auto', 'rotate', 'display'],
        action: () => this.options.onToggleKiosk?.(),
      },
      {
        id: 'act-cheatsheet',
        title: '⌨️ Keyboard Navigation Cheatsheet',
        subtitle: 'View all shortcuts for spatial navigation, quick actions, and search',
        category: 'Actions',
        icon: 'help-circle',
        keywords: ['keyboard', 'shortcuts', 'cheatsheet', 'vim', 'hotkeys', '?'],
        action: () => this.options.onOpenCheatsheet?.(),
      },
      {
        id: 'act-settings',
        title: 'Open Settings Hub',
        subtitle: 'Configure dashboard title, weather, PIN, webhooks, and styles (Ctrl+E)',
        category: 'Actions',
        icon: 'settings',
        keywords: ['settings', 'config', 'edit', 'preferences', 'pin', 'weather', 'css'],
        action: () => this.options.onOpenSettings(),
      },
      {
        id: 'act-bento-customize',
        title: 'Customize Bento Tile Grid',
        subtitle: 'Drag and drop tiles, cycle spans, and toggle telemetry graphs',
        category: 'Actions',
        icon: 'edit',
        keywords: ['bento', 'customize', 'edit', 'drag', 'tiles'],
        action: () => this.options.onToggleBentoCustomize(),
      }
    );

    this.items = items;
  }

  public open(): void {
    if (!this.dialog || !this.input) return;
    this.rebuildIndex();
    this.input.value = '';
    this.filter('');
    this.dialog.showModal();
    this.input.focus();
  }

  public close(): void {
    if (this.dialog?.open) {
      this.dialog.close();
    }
  }

  public isOpen(): boolean {
    return !!this.dialog?.open;
  }

  public filter(query: string): void {
    const q = query.toLowerCase().trim();

    if (!q) {
      this.filteredItems = this.items.slice(0, 30);
    } else {
      this.filteredItems = this.items.filter((item) => {
        if (item.title.toLowerCase().includes(q)) return true;
        if (item.subtitle && item.subtitle.toLowerCase().includes(q)) return true;
        if (item.keywords && item.keywords.some((k) => k.includes(q))) return true;
        return false;
      });
    }

    this.selectedIndex = 0;
    this.renderResults();
  }

  private navigate(delta: number): void {
    if (this.filteredItems.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.filteredItems.length) % this.filteredItems.length;
    this.updateSelectionVisuals();
  }

  private executeCurrent(): void {
    const item = this.filteredItems[this.selectedIndex];
    if (item) {
      this.close();
      item.action();
    }
  }

  private renderResults(): void {
    if (!this.resultsList) return;

    if (this.filteredItems.length === 0) {
      this.resultsList.innerHTML = `
        <div class="cmd-empty-state">
          <p>No matching commands or services found.</p>
          <span class="cmd-empty-hint">Try searching for a service name, layout, or "theme"</span>
        </div>
      `;
      return;
    }

    // Group by category
    const grouped = new Map<string, Array<{ item: CommandItem; originalIndex: number }>>();
    this.filteredItems.forEach((item, idx) => {
      const group = grouped.get(item.category) || [];
      group.push({ item, originalIndex: idx });
      grouped.set(item.category, group);
    });

    let html = '';
    grouped.forEach((entries, category) => {
      html += `<div class="cmd-group-header">${category}</div>`;
      entries.forEach(({ item, originalIndex }) => {
        const isSelected = originalIndex === this.selectedIndex;
        html += `
          <div 
            class="cmd-item ${isSelected ? 'selected' : ''}" 
            data-cmd-index="${originalIndex}"
          >
            <div class="cmd-item-left">
              <span class="cmd-item-icon">⚡</span>
              <div class="cmd-item-text">
                <span class="cmd-item-title">${this.escapeHtml(item.title)}</span>
                ${item.subtitle ? `<span class="cmd-item-subtitle">${this.escapeHtml(item.subtitle)}</span>` : ''}
              </div>
            </div>
            <kbd class="cmd-item-badge">↵</kbd>
          </div>
        `;
      });
    });

    this.resultsList.innerHTML = html;

    // Click handler for result items
    this.resultsList.querySelectorAll<HTMLElement>('.cmd-item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-cmd-index') || '0', 10);
        this.selectedIndex = idx;
        this.executeCurrent();
      });

      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.getAttribute('data-cmd-index') || '0', 10);
        this.selectedIndex = idx;
        this.updateSelectionVisuals();
      });
    });

    this.scrollSelectedIntoView();
  }

  private updateSelectionVisuals(): void {
    if (!this.resultsList) return;
    this.resultsList.querySelectorAll<HTMLElement>('.cmd-item').forEach((el) => {
      const idx = parseInt(el.getAttribute('data-cmd-index') || '0', 10);
      el.classList.toggle('selected', idx === this.selectedIndex);
    });
    this.scrollSelectedIntoView();
  }

  private scrollSelectedIntoView(): void {
    if (!this.resultsList) return;
    const selectedEl = this.resultsList.querySelector<HTMLElement>('.cmd-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
