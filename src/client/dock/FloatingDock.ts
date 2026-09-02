import type { LayoutMode, ThemeName } from '../../shared/types.js';

export interface FloatingDockOptions {
  onLayoutSelect: (layout: LayoutMode) => void;
  onThemeSelect: (theme: ThemeName) => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  onToggleBentoCustomize: () => void;
  onQuickAdd?: () => void;
  onToggleKiosk?: () => void;
  getCurrentLayout: () => LayoutMode;
  getCurrentTheme: () => ThemeName;
}

export class FloatingDock {
  private container: HTMLElement | null = null;
  private currentLayout: LayoutMode;
  private currentTheme: ThemeName;
  private options: FloatingDockOptions;
  private isThemePopoverOpen: boolean = false;
  private isBentoEditing: boolean = false;
  private isKioskActive: boolean = false;

  constructor(options: FloatingDockOptions) {
    this.options = options;
    this.currentLayout = options.getCurrentLayout();
    this.currentTheme = options.getCurrentTheme();
  }

  public init(): void {
    this.container = document.getElementById('floating-action-dock');
    if (!this.container) return;

    this.render();
    this.attachEventListeners();
  }

  public render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dock-wrapper" id="dock-wrapper">
        <!-- Layout Switcher Segmented Control -->
        <div class="dock-segment-group" role="group" aria-label="Dashboard Layout Modes">
          <div class="dock-pill-indicator" id="dock-pill-indicator"></div>
          <button type="button" class="dock-btn ${this.currentLayout === 'grid' ? 'active' : ''}" data-dock-layout="grid" title="Categorized Grid (Ctrl+1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            <span class="dock-btn-label">Grid</span>
          </button>
          <button type="button" class="dock-btn ${this.currentLayout === 'bento' ? 'active' : ''}" data-dock-layout="bento" title="Bento Grid (Ctrl+2)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="7" x="3" y="3" rx="1" />
              <rect width="8" height="9" x="3" y="12" rx="1" />
              <rect width="8" height="9" x="13" y="12" rx="1" />
            </svg>
            <span class="dock-btn-label">Bento</span>
          </button>
          <button type="button" class="dock-btn ${this.currentLayout === 'compact' ? 'active' : ''}" data-dock-layout="compact" title="Compact List (Ctrl+3)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" x2="21" y1="6" y2="6" />
              <line x1="8" x2="21" y1="12" y2="12" />
              <line x1="8" x2="21" y1="18" y2="18" />
              <line x1="3" x2="3.01" y1="6" y2="6" />
              <line x1="3" x2="3.01" y1="12" y2="12" />
              <line x1="3" x2="3.01" y1="18" y2="18" />
            </svg>
            <span class="dock-btn-label">List</span>
          </button>
        </div>

        <div class="dock-divider"></div>

        <!-- Quick Add Button -->
        <button 
          type="button" 
          id="dock-btn-quickadd" 
          class="dock-action-btn" 
          title="Quick Add Service (+)"
        >
          <span class="dock-icon">➕</span>
          <span class="dock-btn-label">Add</span>
        </button>

        <!-- Bento Edit Button (Visible when layout is Bento) -->
        <button 
          type="button" 
          id="dock-btn-bento-edit" 
          class="dock-action-btn dock-bento-btn ${this.isBentoEditing ? 'active' : ''}" 
          style="${this.currentLayout === 'bento' ? 'display: inline-flex;' : 'display: none;'}"
          title="Customize Bento Tiles"
        >
          <span class="dock-icon">${this.isBentoEditing ? '💾' : '✏️'}</span>
          <span class="dock-btn-label">${this.isBentoEditing ? 'Done' : 'Customize'}</span>
        </button>

        <!-- Theme Flyout Trigger -->
        <div class="dock-popover-anchor">
          <button type="button" id="dock-btn-theme" class="dock-action-btn" title="Switch Theme Palette">
            <span class="dock-icon">🎨</span>
            <span class="dock-btn-label">${this.formatThemeName(this.currentTheme)}</span>
          </button>

          <!-- Theme Popover Menu -->
          <div class="dock-theme-popover ${this.isThemePopoverOpen ? 'open' : ''}" id="dock-theme-popover">
            <div class="dock-theme-grid">
              <button type="button" class="dock-theme-option ${this.currentTheme === 'dark' ? 'active' : ''}" data-theme-option="dark">
                <span class="theme-swatch" style="background: #0f172a;"></span>
                <span>Dark</span>
              </button>
              <button type="button" class="dock-theme-option ${this.currentTheme === 'nord' ? 'active' : ''}" data-theme-option="nord">
                <span class="theme-swatch" style="background: #2e3440;"></span>
                <span>Nord</span>
              </button>
              <button type="button" class="dock-theme-option ${this.currentTheme === 'dracula' ? 'active' : ''}" data-theme-option="dracula">
                <span class="theme-swatch" style="background: #282a36;"></span>
                <span>Dracula</span>
              </button>
              <button type="button" class="dock-theme-option ${this.currentTheme === 'catppuccin' ? 'active' : ''}" data-theme-option="catppuccin">
                <span class="theme-swatch" style="background: #1e1e2e;"></span>
                <span>Catppuccin</span>
              </button>
              <button type="button" class="dock-theme-option ${this.currentTheme === 'cyberpunk' ? 'active' : ''}" data-theme-option="cyberpunk">
                <span class="theme-swatch" style="background: #000b1e; border: 1px solid #00f0ff;"></span>
                <span>Cyberpunk</span>
              </button>
              <button type="button" class="dock-theme-option ${this.currentTheme === 'glass' ? 'active' : ''}" data-theme-option="glass">
                <span class="theme-swatch" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);"></span>
                <span>Glass</span>
              </button>
              <button type="button" class="dock-theme-option ${this.currentTheme === 'light' ? 'active' : ''}" data-theme-option="light">
                <span class="theme-swatch" style="background: #f8fafc; border: 1px solid #cbd5e1;"></span>
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Command Palette Quick Trigger -->
        <button type="button" id="dock-btn-cmd" class="dock-action-btn" title="Open Command Palette (Ctrl+K)">
          <span class="dock-icon">⚡</span>
          <kbd class="dock-kbd">⌘K</kbd>
        </button>

        <!-- Kiosk Wallboard Mode Trigger -->
        <button 
          type="button" 
          id="dock-btn-kiosk" 
          class="dock-action-btn ${this.isKioskActive ? 'active' : ''}" 
          title="Toggle Auto-Rotating Kiosk Wallboard"
        >
          <span class="dock-icon">${this.isKioskActive ? '⏸️' : '📺'}</span>
        </button>

        <!-- Config Editor Launcher -->
        <button type="button" id="dock-btn-settings" class="dock-action-btn dock-edit-btn" title="Edit Dashboard Settings (Ctrl+E)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px;">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span class="dock-btn-label">Edit</span>
        </button>
      </div>
    `;

    this.updateIndicator();
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Layout buttons
    this.container.querySelectorAll<HTMLButtonElement>('[data-dock-layout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const layout = btn.getAttribute('data-dock-layout') as LayoutMode;
        if (layout) {
          this.setLayout(layout);
          this.options.onLayoutSelect(layout);
        }
      });
    });

    // Theme Popover toggle
    const themeBtn = this.container.querySelector('#dock-btn-theme');
    themeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isThemePopoverOpen = !this.isThemePopoverOpen;
      const popover = this.container?.querySelector('#dock-theme-popover');
      popover?.classList.toggle('open', this.isThemePopoverOpen);
    });

    // Theme options
    this.container.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const theme = btn.getAttribute('data-theme-option') as ThemeName;
        if (theme) {
          this.setTheme(theme);
          this.options.onThemeSelect(theme);
          this.isThemePopoverOpen = false;
          const popover = this.container?.querySelector('#dock-theme-popover');
          popover?.classList.remove('open');
        }
      });
    });

    // Close theme popover when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isThemePopoverOpen && !this.container?.contains(e.target as Node)) {
        this.isThemePopoverOpen = false;
        const popover = this.container?.querySelector('#dock-theme-popover');
        popover?.classList.remove('open');
      }
    });

    // Quick Add trigger
    const quickAddBtn = this.container.querySelector('#dock-btn-quickadd');
    quickAddBtn?.addEventListener('click', () => {
      this.options.onQuickAdd?.();
    });

    // Command palette trigger
    const cmdBtn = this.container.querySelector('#dock-btn-cmd');
    cmdBtn?.addEventListener('click', () => {
      this.options.onOpenCommandPalette();
    });

    // Kiosk trigger
    const kioskBtn = this.container.querySelector('#dock-btn-kiosk');
    kioskBtn?.addEventListener('click', () => {
      this.options.onToggleKiosk?.();
    });

    // Edit button trigger
    const editBtn = this.container.querySelector('#dock-btn-settings');
    editBtn?.addEventListener('click', () => {
      this.options.onOpenSettings();
    });

    // Bento edit button
    const bentoBtn = this.container.querySelector('#dock-btn-bento-edit');
    bentoBtn?.addEventListener('click', () => {
      this.options.onToggleBentoCustomize();
    });
  }

  public setLayout(layout: LayoutMode): void {
    this.currentLayout = layout;
    if (!this.container) return;

    this.container.querySelectorAll<HTMLButtonElement>('[data-dock-layout]').forEach((btn) => {
      const isActive = btn.getAttribute('data-dock-layout') === layout;
      btn.classList.toggle('active', isActive);
    });

    const bentoBtn = this.container.querySelector<HTMLElement>('#dock-btn-bento-edit');
    if (bentoBtn) {
      bentoBtn.style.display = layout === 'bento' ? 'inline-flex' : 'none';
    }

    this.updateIndicator();
  }

  public setTheme(theme: ThemeName): void {
    this.currentTheme = theme;
    if (!this.container) return;

    const themeLabel = this.container.querySelector('#dock-btn-theme .dock-btn-label');
    if (themeLabel) {
      themeLabel.textContent = this.formatThemeName(theme);
    }

    this.container.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-theme-option') === theme);
    });
  }

  public setBentoEditing(isEditing: boolean): void {
    this.isBentoEditing = isEditing;
    const bentoBtn = this.container?.querySelector<HTMLButtonElement>('#dock-btn-bento-edit');
    if (bentoBtn) {
      bentoBtn.classList.toggle('active', isEditing);
      bentoBtn.innerHTML = isEditing
        ? `<span class="dock-icon">💾</span><span class="dock-btn-label">Done</span>`
        : `<span class="dock-icon">✏️</span><span class="dock-btn-label">Customize</span>`;
    }
  }

  public setKioskActive(isActive: boolean): void {
    this.isKioskActive = isActive;
    const kioskBtn = this.container?.querySelector<HTMLButtonElement>('#dock-btn-kiosk');
    if (kioskBtn) {
      kioskBtn.classList.toggle('active', isActive);
      kioskBtn.innerHTML = `<span class="dock-icon">${isActive ? '⏸️' : '📺'}</span>`;
    }
  }

  private updateIndicator(): void {
    if (!this.container) return;
    const activeBtn = this.container.querySelector<HTMLElement>(`[data-dock-layout="${this.currentLayout}"]`);
    const indicator = this.container.querySelector<HTMLElement>('#dock-pill-indicator');

    if (activeBtn && indicator) {
      const offsetLeft = activeBtn.offsetLeft;
      const width = activeBtn.offsetWidth;
      indicator.style.transform = `translateX(${offsetLeft}px)`;
      indicator.style.width = `${width}px`;
    }
  }

  private formatThemeName(theme: string): string {
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  }
}
