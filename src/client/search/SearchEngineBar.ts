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

export class SearchEngineBar {
  private activeEngineId: string = 'google';
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;

  constructor() {
    this.loadSavedEngine();
    this.init();
  }

  private loadSavedEngine(): void {
    try {
      const saved = localStorage.getItem('dashpark_search_engine');
      if (saved && SEARCH_ENGINES.some((e) => e.id === saved)) {
        this.activeEngineId = saved;
      }
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

  public executeSearch(rawQuery: string): void {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    let targetEngine = this.getActiveEngine();
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
    window.open(searchUrl, '_blank');
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
        // If query starts with '!' or looks like a web search, open web search
        if (val.trim()) {
          this.executeSearch(val);
        }
      }
    });

    this.updateActiveChipVisuals();
  }
}
