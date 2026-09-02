import type { DashParkConfig, DashboardPage, Category } from '../../shared/types.js';
import { getSvgIcon } from '../icons/lucide-svgs.js';

export class PageRouter {
  private activePageId: string = 'home';
  private onPageChangeCallback: (pageId: string) => void;

  constructor(onPageChange: (pageId: string) => void) {
    this.onPageChangeCallback = onPageChange;
    this.initHashListener();
  }

  private initHashListener(): void {
    const parseHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/page=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        this.activePageId = match[1];
        this.onPageChangeCallback(this.activePageId);
      }
    };

    window.addEventListener('hashchange', parseHash);
    parseHash();
  }

  public getActivePageId(): string {
    return this.activePageId;
  }

  public setActivePageId(pageId: string): void {
    this.activePageId = pageId;
    window.location.hash = `page=${pageId}`;
    this.onPageChangeCallback(pageId);
  }

  public getActiveCategories(config: DashParkConfig | null): Category[] {
    if (!config) return [];

    const pages = config.pages || [];
    if (pages.length > 0) {
      const active = pages.find((p) => p.id === this.activePageId) || pages[0];
      if (active) return active.categories;
    }

    return config.categories || [];
  }

  public renderPageTabs(config: DashParkConfig | null, container: HTMLElement | null): void {
    if (!container || !config) return;

    const pages: DashboardPage[] = config.pages && config.pages.length > 0 
      ? config.pages 
      : [{ id: 'home', name: 'Overview', icon: 'home', categories: config.categories || [] }];

    if (pages.length <= 1) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = pages
      .map((p) => {
        const isActive = p.id === this.activePageId || (!pages.some(pg => pg.id === this.activePageId) && p === pages[0]);
        const iconSvg = getSvgIcon(p.icon || 'home');
        return `
          <button 
            type="button" 
            class="page-tab-btn ${isActive ? 'active' : ''}" 
            data-page-id="${p.id}"
            title="${p.description || p.name}"
          >
            <span class="page-tab-icon">${iconSvg}</span>
            <span class="page-tab-name">${this.escapeHtml(p.name)}</span>
          </button>
        `;
      })
      .join('');

    container.querySelectorAll<HTMLButtonElement>('.page-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-page-id');
        if (pid) {
          this.setActivePageId(pid);
        }
      });
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
