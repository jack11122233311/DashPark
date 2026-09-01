import type { ConfigResponse, Category, ServiceItem, ServerHealthResponse, DashboardMeta, ErrorDiagnostic } from '../shared/types.js';

class DashParkClient {
  public configResponse: ConfigResponse | null = null;
  private searchTerm: string = '';

  constructor() {
    this.initClock();
    this.initSearch();
    this.initKeyboardShortcuts();
    this.loadData();

    // Poll server health every 10 seconds
    setInterval(() => this.updateServerHealth(), 10000);
  }

  private initClock(): void {
    const clockEl = document.getElementById('clock-display');
    const update = () => {
      if (!clockEl) return;
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };
    update();
    setInterval(update, 1000);
  }

  private initSearch(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
      this.filterServices();
    });
  }

  private initKeyboardShortcuts(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput?.focus();
        searchInput?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInput) {
        if (searchInput) {
          searchInput.value = '';
          searchInput.blur();
        }
        this.searchTerm = '';
        this.filterServices();
      }
    });
  }

  private async loadData(): Promise<void> {
    await Promise.all([this.loadConfig(), this.updateServerHealth()]);
  }

  private async updateServerHealth(): Promise<void> {
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error('Health check failed');
      const data: ServerHealthResponse = await res.json();

      const statsPill = document.getElementById('server-stats-text');
      const statusDot = document.querySelector('.status-dot');
      const footerMem = document.getElementById('footer-memory');

      if (statsPill) statsPill.textContent = `v${data.version} • ${data.memoryUsageMb} MB RAM`;
      if (footerMem) footerMem.textContent = `Memory: ${data.memoryUsageMb} MB • Uptime: ${data.uptimeSeconds}s`;
      if (statusDot) {
        statusDot.className = 'status-dot online';
      }
    } catch {
      const statsPill = document.getElementById('server-stats-text');
      const statusDot = document.querySelector('.status-dot');
      if (statsPill) statsPill.textContent = 'v0.0.1 • Offline';
      if (statusDot) {
        statusDot.className = 'status-dot error';
      }
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const res = await fetch('/api/v1/config');
      const data: ConfigResponse = await res.json();
      this.configResponse = data;

      if (!data.valid && data.diagnostics && data.diagnostics.length > 0) {
        this.showDiagnostics(data.diagnostics);
      } else {
        this.hideDiagnostics();
      }

      if (data.config) {
        this.applyMeta(data.config.meta);
        this.renderCategories(data.config.categories);
      }
    } catch (err) {
      console.error('[DashPark] Failed to load config:', err);
      this.showDiagnostics([
        {
          line: 1,
          column: 1,
          message: 'Unable to communicate with the DashPark API server.',
          severity: 'error',
        },
      ]);
    }
  }

  private applyMeta(meta?: DashboardMeta): void {
    if (!meta) return;
    const titleEl = document.getElementById('dashboard-title');
    const subtitleEl = document.getElementById('dashboard-subtitle');
    if (titleEl) titleEl.textContent = meta.title || 'DashPark';
    if (subtitleEl) subtitleEl.textContent = meta.subtitle || 'Homelab & Server Park';
    document.title = `${meta.title || 'DashPark'} — Dashboard`;

    if (meta.accentColor) {
      document.documentElement.style.setProperty('--accent-primary', meta.accentColor);
    }
  }

  private showDiagnostics(diagnostics: ErrorDiagnostic[]): void {
    const banner = document.getElementById('diagnostic-banner');
    const lineEl = document.getElementById('diag-line');
    const colEl = document.getElementById('diag-col');
    const msgEl = document.getElementById('diag-message');
    const snippetEl = document.getElementById('diag-snippet');

    if (!banner || diagnostics.length === 0) return;

    const first = diagnostics[0];
    if (lineEl) lineEl.textContent = String(first.line || 1);
    if (colEl) colEl.textContent = String(first.column || 1);
    if (msgEl) msgEl.textContent = first.message;

    if (snippetEl) {
      snippetEl.textContent = first.snippet || `${first.message} (Line ${first.line})`;
      snippetEl.style.display = first.snippet ? 'block' : 'none';
    }

    banner.classList.remove('hidden');
  }

  private hideDiagnostics(): void {
    const banner = document.getElementById('diagnostic-banner');
    if (banner) banner.classList.add('hidden');
  }

  private getIconUrl(iconIdentifier?: string, serviceUrl?: string): string {
    if (!iconIdentifier && serviceUrl) {
      try {
        const domain = new URL(serviceUrl).hostname;
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      } catch {
        return '';
      }
    }

    if (!iconIdentifier) return '';

    if (iconIdentifier.startsWith('http://') || iconIdentifier.startsWith('https://') || iconIdentifier.startsWith('/')) {
      return iconIdentifier;
    }

    // Default to popular dashboard-icons CDN
    return `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${encodeURIComponent(iconIdentifier.toLowerCase())}.png`;
  }

  private renderCategories(categories: Category[]): void {
    const container = document.getElementById('categories-container');
    if (!container) return;

    if (categories.length === 0) {
      container.innerHTML = `
        <div class="loading-state">
          <p>No categories or services defined in your configuration.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = categories
      .map(
        (cat) => `
        <section class="category-section" data-category-id="${cat.id}">
          <div class="category-header">
            <div class="category-title-group">
              <h2 class="category-title">${this.escapeHtml(cat.name)}</h2>
              <span class="category-count">${cat.services.length}</span>
            </div>
          </div>
          <div class="service-grid">
            ${cat.services.map((svc) => this.renderServiceCard(svc)).join('')}
          </div>
        </section>
      `
      )
      .join('');
  }

  private renderServiceCard(svc: ServiceItem): string {
    const iconUrl = this.getIconUrl(svc.icon, svc.url);
    const initial = (svc.name || 'S').substring(0, 2).toUpperCase();

    return `
      <a 
        href="${this.escapeHtml(svc.url)}" 
        target="${svc.target || '_blank'}" 
        rel="noopener noreferrer"
        class="service-card" 
        data-service-name="${this.escapeHtml(svc.name.toLowerCase())}"
        data-service-desc="${this.escapeHtml((svc.description || '').toLowerCase())}"
        data-service-tags="${this.escapeHtml((svc.tags || []).join(' ').toLowerCase())}"
      >
        <div class="service-icon-box">
          ${
            iconUrl
              ? `<img src="${this.escapeHtml(iconUrl)}" alt="${this.escapeHtml(svc.name)}" loading="lazy" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='block';" /><span style="display:none;">${initial}</span>`
              : `<span>${initial}</span>`
          }
        </div>
        <div class="service-content">
          <div class="service-header-row">
            <h3 class="service-name">${this.escapeHtml(svc.name)}</h3>
            <span class="service-status-dot online"></span>
          </div>
          ${svc.description ? `<p class="service-desc">${this.escapeHtml(svc.description)}</p>` : ''}
        </div>
      </a>
    `;
  }

  private filterServices(): void {
    const cards = document.querySelectorAll<HTMLElement>('.service-card');
    const sections = document.querySelectorAll<HTMLElement>('.category-section');

    cards.forEach((card) => {
      const name = card.getAttribute('data-service-name') || '';
      const desc = card.getAttribute('data-service-desc') || '';
      const tags = card.getAttribute('data-service-tags') || '';
      const matches = !this.searchTerm || name.includes(this.searchTerm) || desc.includes(this.searchTerm) || tags.includes(this.searchTerm);

      card.style.display = matches ? 'flex' : 'none';
    });

    sections.forEach((section) => {
      const visibleCards = section.querySelectorAll('.service-card[style*="display: flex"], .service-card:not([style*="display: none"])');
      section.style.display = visibleCards.length > 0 ? 'flex' : 'none';
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

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new DashParkClient();
});
