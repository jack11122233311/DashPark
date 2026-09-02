import type { SearchTargetMode } from '../../shared/types.js';

export interface SearchEngine {
  id: string;
  name: string;
  bang: string;
  icon: string;
  urlTemplate: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', bang: '!g', icon: '🔍', urlTemplate: 'https://www.google.com/search?q=%s' },
  { id: 'duckduckgo', name: 'DuckDuckGo', bang: '!d', icon: '🦆', urlTemplate: 'https://duckduckgo.com/?q=%s' },
  { id: 'brave', name: 'Brave', bang: '!b', icon: '🦁', urlTemplate: 'https://search.brave.com/search?q=%s' },
  { id: 'youtube', name: 'YouTube', bang: '!yt', icon: '▶️', urlTemplate: 'https://www.youtube.com/results?search_query=%s' },
  { id: 'reddit', name: 'Reddit', bang: '!r', icon: '🤖', urlTemplate: 'https://www.reddit.com/search/?q=%s' },
  { id: 'github', name: 'GitHub', bang: '!gh', icon: '🐙', urlTemplate: 'https://github.com/search?q=%s' },
  { id: 'wikipedia', name: 'Wikipedia', bang: '!w', icon: '📚', urlTemplate: 'https://en.wikipedia.org/wiki/Special:Search?search=%s' },
  { id: 'searxng', name: 'SearXNG', bang: '!sx', icon: '🔎', urlTemplate: 'https://searx.be/search?q=%s' },
];

export interface SearchEngineBarOptions {
  onPopupBlocked?: (url: string) => void;
}

export class SearchEngineBar {
  private activeEngineId: string = 'google';
  private targetMode: SearchTargetMode = 'new_tab';
  private targetScreen: number = 0;
  private windowWidth: number = 1400;
  private windowHeight: number = 900;
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private options?: SearchEngineBarOptions;

  constructor(options?: SearchEngineBarOptions) {
    this.options = options;
    this.loadPreferences();
    this.init();
  }

  private loadPreferences(): void {
    try {
      const savedEngine = localStorage.getItem('dashpark_search_engine');
      if (savedEngine && SEARCH_ENGINES.some((e) => e.id === savedEngine)) {
        this.activeEngineId = savedEngine;
      }

      const savedTarget = localStorage.getItem('dashpark_search_target') as SearchTargetMode | null;
      if (savedTarget && ['new_tab', 'same_tab', 'new_window', 'target_screen'].includes(savedTarget)) {
        this.targetMode = savedTarget;
      }

      const savedScreen = localStorage.getItem('dashpark_search_screen_index');
      if (savedScreen !== null) {
        this.targetScreen = Math.max(0, parseInt(savedScreen, 10) || 0);
      }

      const savedW = localStorage.getItem('dashpark_search_win_width');
      if (savedW) this.windowWidth = parseInt(savedW, 10) || 1400;

      const savedH = localStorage.getItem('dashpark_search_win_height');
      if (savedH) this.windowHeight = parseInt(savedH, 10) || 900;
    } catch {
      // Ignore
    }
  }

  public init(): void {
    const searchBox = document.querySelector('.search-box-container');
    if (!searchBox) return;

    this.container = searchBox as HTMLElement;
    this.input = document.getElementById('search-input') as HTMLInputElement | null;

    this.renderEngineSelector();
    this.attachSearchListener();
  }

  public getActiveEngine(): SearchEngine {
    return SEARCH_ENGINES.find((e) => e.id === this.activeEngineId) || SEARCH_ENGINES[0];
  }

  public setActiveEngine(id: string): void {
    if (SEARCH_ENGINES.some((e) => e.id === id)) {
      this.activeEngineId = id;
      try {
        localStorage.setItem('dashpark_search_engine', id);
      } catch {
        // Ignore
      }
      this.updateActiveChipVisuals();
    }
  }

  public getTargetMode(): SearchTargetMode {
    return this.targetMode;
  }

  public getTargetScreen(): number {
    return this.targetScreen;
  }

  public setTargetOptions(options: {
    target?: SearchTargetMode;
    targetScreen?: number;
    windowWidth?: number;
    windowHeight?: number;
  }): void {
    if (options.target) {
      this.targetMode = options.target;
      try {
        localStorage.setItem('dashpark_search_target', options.target);
      } catch {
        // Ignore
      }
    }

    if (options.targetScreen !== undefined) {
      this.targetScreen = options.targetScreen;
      try {
        localStorage.setItem('dashpark_search_screen_index', String(options.targetScreen));
      } catch {
        // Ignore
      }
    }

    if (options.windowWidth !== undefined) {
      this.windowWidth = options.windowWidth;
      try {
        localStorage.setItem('dashpark_search_win_width', String(options.windowWidth));
      } catch {
        // Ignore
      }
    }

    if (options.windowHeight !== undefined) {
      this.windowHeight = options.windowHeight;
      try {
        localStorage.setItem('dashpark_search_win_height', String(options.windowHeight));
      } catch {
        // Ignore
      }
    }
  }

  public async executeSearch(rawQuery: string, customEngine?: SearchEngine): Promise<void> {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    let targetEngine = customEngine || this.getActiveEngine();
    let query = trimmed;

    // Check for bang operator prefix (e.g. "!yt plex setup" or "!r homelab")
    const bangMatch = trimmed.match(/^(![a-zA-Z0-9]+)\s+(.+)$/);
    if (bangMatch) {
      const bang = bangMatch[1].toLowerCase();
      const matchedEngine = SEARCH_ENGINES.find((e) => e.bang.toLowerCase() === bang);
      if (matchedEngine) {
        targetEngine = matchedEngine;
        query = bangMatch[2];
      }
    }

    const searchUrl = targetEngine.urlTemplate.replace('%s', encodeURIComponent(query));
    await this.dispatchSearchUrl(searchUrl);
  }

  private async dispatchSearchUrl(url: string): Promise<void> {
    // 1. Same Tab Mode
    if (this.targetMode === 'same_tab') {
      window.location.assign(url);
      return;
    }

    // 2. New Tab Mode (Default)
    if (this.targetMode === 'new_tab') {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        this.handlePopupBlocked(url);
      }
      return;
    }

    // 3. New Window Mode (Centered popup window)
    if (this.targetMode === 'new_window') {
      const width = this.windowWidth || 1400;
      const height = this.windowHeight || 900;
      const availLeft = (window.screen as any).availLeft ?? 0;
      const availTop = (window.screen as any).availTop ?? 0;
      const availWidth = window.screen.availWidth ?? 1920;
      const availHeight = window.screen.availHeight ?? 1080;

      const left = Math.max(0, Math.round(availLeft + (availWidth - width) / 2));
      const top = Math.max(0, Math.round(availTop + (availHeight - height) / 2));
      const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;

      const win = window.open(url, '_blank', features);
      if (!win) {
        this.handlePopupBlocked(url);
      }
      return;
    }

    // 4. Target Screen Mode (Multi-Screen Window Placement API)
    if (this.targetMode === 'target_screen') {
      const width = this.windowWidth || 1400;
      const height = this.windowHeight || 900;
      let left = ((window.screen as any).availLeft ?? 0) + (this.targetScreen * (window.screen.availWidth ?? 1920));
      let top = (window.screen as any).availTop ?? 0;

      // Check for modern Multi-Screen Window Placement API
      if ('getScreenDetails' in window && typeof (window as any).getScreenDetails === 'function') {
        try {
          const screenDetails = await (window as any).getScreenDetails();
          const screens = screenDetails.screens || [];
          const chosenScreen = screens[this.targetScreen] || screens[0];
          if (chosenScreen) {
            left = chosenScreen.availLeft + Math.max(0, Math.round((chosenScreen.availWidth - width) / 2));
            top = chosenScreen.availTop + Math.max(0, Math.round((chosenScreen.availHeight - height) / 2));
          }
        } catch {
          // Keep virtual display calculation
        }
      }

      const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
      const win = window.open(url, '_blank', features);
      if (!win) {
        this.handlePopupBlocked(url);
      }
    }
  }

  private handlePopupBlocked(url: string): void {
    if (this.options?.onPopupBlocked) {
      this.options.onPopupBlocked(url);
    } else {
      // Direct fallback
      window.open(url, '_blank');
    }
  }

  private renderEngineSelector(): void {
    let chipsContainer = document.getElementById('search-engine-chips');
    if (!chipsContainer && this.container) {
      chipsContainer = document.createElement('div');
      chipsContainer.id = 'search-engine-chips';
      chipsContainer.className = 'search-engine-chips';
      this.container.appendChild(chipsContainer);
    }

    if (!chipsContainer) return;

    chipsContainer.innerHTML = SEARCH_ENGINES.map(
      (e) => `
        <button 
          type="button" 
          class="search-engine-chip ${e.id === this.activeEngineId ? 'active' : ''}" 
          data-engine-id="${e.id}"
          title="Search on ${e.name} (${e.bang})"
        >
          <span class="engine-icon">${e.icon}</span>
          <span class="engine-name">${e.name}</span>
        </button>
      `
    ).join('');

    chipsContainer.querySelectorAll<HTMLButtonElement>('.search-engine-chip').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const engineId = btn.getAttribute('data-engine-id');
        if (engineId) {
          this.setActiveEngine(engineId);
        }
      });
    });
  }

  private updateActiveChipVisuals(): void {
    const chips = document.querySelectorAll<HTMLElement>('.search-engine-chip');
    chips.forEach((chip) => {
      const id = chip.getAttribute('data-engine-id');
      chip.classList.toggle('active', id === this.activeEngineId);
    });

    if (this.input) {
      const active = this.getActiveEngine();
      this.input.placeholder = `Search with ${active.name} or type service name... (e.g. !yt, !r)`;
    }
  }

  private attachSearchListener(): void {
    if (!this.input) return;

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this.input?.value || '';
        if (val.trim()) {
          this.executeSearch(val);
        }
      }
    });

    this.updateActiveChipVisuals();
  }
}
