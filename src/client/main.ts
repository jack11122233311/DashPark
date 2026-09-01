import type {
  ConfigResponse,
  Category,
  ServiceItem,
  ServerHealthResponse,
  DashboardMeta,
  ErrorDiagnostic,
  LayoutMode,
  ThemeName,
  HealthStatus,
} from '../shared/types.js';
import { globalIconResolver } from './icons/IconResolver.js';
import { getSvgIcon, SVG_ICONS } from './icons/lucide-svgs.js';
import { SystemWidget } from './widgets/SystemWidget.js';
import { ConfigEditor } from './editor/ConfigEditor.js';

// Extend window for global icon fallback callbacks
declare global {
  interface Window {
    __dashParkIconLoaded?: (img: HTMLImageElement) => void;
    __dashParkIconError?: (img: HTMLImageElement) => void;
    __dashParkToggleCategory?: (id: string) => void;
  }
}

interface ServiceHealthData {
  serviceId: string;
  status: HealthStatus;
  latencyMs: number;
  statusCode?: number;
  error?: string;
  lastCheckedAt: string;
}

class DashParkClient {
  public configResponse: ConfigResponse | null = null;
  private searchTerm: string = '';
  private activeTag: string | null = null;
  private currentLayout: LayoutMode = 'grid';
  private currentTheme: ThemeName = 'dark';
  private collapsedCategories: Set<string> = new Set();
  private healthDataMap: Map<string, ServiceHealthData> = new Map();

  public systemWidget: SystemWidget | null = null;
  public configEditor: ConfigEditor | null = null;

  constructor() {
    this.initGlobalIconHandlers();
    this.loadPreferences();
    this.initClock();
    this.initSearch();
    this.initLayoutSwitcher();
    this.initThemeSelector();
    this.initEditor();
    this.initKeyboardShortcuts();
    this.initSystemWidget();

    this.loadData();

    // Poll server health & service statuses periodically
    setInterval(() => this.updateServerHealth(), 10000);
    setInterval(() => this.pollServiceHealth(), 15000);
  }

  private initSystemWidget(): void {
    this.systemWidget = new SystemWidget('system-telemetry-bar');
  }

  private initEditor(): void {
    this.configEditor = new ConfigEditor(() => {
      this.loadConfig();
    });

    const openEditorBtn = document.getElementById('btn-open-editor');
    openEditorBtn?.addEventListener('click', () => {
      this.configEditor?.open();
    });
  }

  private initGlobalIconHandlers(): void {
    window.__dashParkIconLoaded = (img: HTMLImageElement) => {
      const wrapper = img.closest<HTMLElement>('.dashpark-icon-wrapper');
      if (!wrapper) return;
      const cacheKey = wrapper.getAttribute('data-cache-key');
      if (cacheKey && img.src) {
        globalIconResolver.markWorking(cacheKey, img.src);
      }
    };

    window.__dashParkIconError = (img: HTMLImageElement) => {
      const wrapper = img.closest<HTMLElement>('.dashpark-icon-wrapper');
      if (!wrapper) return;

      const failedSrc = img.src;
      if (failedSrc) {
        globalIconResolver.markFailed(failedSrc);
      }

      const candidatesStr = wrapper.getAttribute('data-candidates') || '';
      const candidates = candidatesStr ? candidatesStr.split('|') : [];
      let nextIndex = parseInt(wrapper.getAttribute('data-candidate-index') || '0', 10) + 1;

      while (nextIndex < candidates.length && candidates[nextIndex] && candidates[nextIndex] === failedSrc) {
        nextIndex++;
      }

      if (nextIndex < candidates.length && candidates[nextIndex]) {
        wrapper.setAttribute('data-candidate-index', String(nextIndex));
        img.src = candidates[nextIndex];
      } else {
        img.style.display = 'none';
        const fallbackContainer = wrapper.querySelector<HTMLElement>('.dashpark-icon-fallback');
        const vectorSpan = wrapper.querySelector<HTMLElement>('.dashpark-icon-vector');
        const initialsSpan = wrapper.querySelector<HTMLElement>('.dashpark-icon-initials');

        if (fallbackContainer) fallbackContainer.style.display = 'flex';
        if (vectorSpan) vectorSpan.style.display = 'flex';
        else if (initialsSpan) initialsSpan.style.display = 'flex';
      }
    };
  }

  private loadPreferences(): void {
    try {
      const savedLayout = localStorage.getItem('dashpark_layout_mode') as LayoutMode;
      if (savedLayout && ['grid', 'bento', 'compact'].includes(savedLayout)) {
        this.currentLayout = savedLayout;
      }
      const savedTheme = localStorage.getItem('dashpark_theme') as ThemeName;
      if (savedTheme) {
        this.currentTheme = savedTheme;
        this.applyTheme(savedTheme);
      }
    } catch {
      // Storage access may be restricted
    }
  }

  private initClock(): void {
    const clockEl = document.getElementById('clock-display');
    const dateEl = document.getElementById('date-display');

    const update = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }
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

  private initLayoutSwitcher(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.layout-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const layout = btn.getAttribute('data-layout') as LayoutMode;
        if (layout) {
          this.setLayout(layout);
        }
      });
    });
    this.updateLayoutButtons();
  }

  public setLayout(layout: LayoutMode): void {
    this.currentLayout = layout;
    try {
      localStorage.setItem('dashpark_layout_mode', layout);
    } catch {
      // Ignore
    }
    this.updateLayoutButtons();
    if (this.configResponse?.config?.categories) {
      this.renderContent();
    }
  }

  private updateLayoutButtons(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.layout-btn');
    buttons.forEach((btn) => {
      const isCurrent = btn.getAttribute('data-layout') === this.currentLayout;
      btn.classList.toggle('active', isCurrent);
    });
  }

  private initThemeSelector(): void {
    const themeSelect = document.getElementById('theme-selector') as HTMLSelectElement | null;
    if (!themeSelect) return;

    themeSelect.value = this.currentTheme;
    themeSelect.addEventListener('change', (e) => {
      const theme = (e.target as HTMLSelectElement).value as ThemeName;
      this.applyTheme(theme);
      try {
        localStorage.setItem('dashpark_theme', theme);
      } catch {
        // Ignore
      }
    });
  }

  private applyTheme(theme: ThemeName): void {
    this.currentTheme = theme;
    document.body.className = `theme-${theme}`;
    const themeSelect = document.getElementById('theme-selector') as HTMLSelectElement | null;
    if (themeSelect && themeSelect.value !== theme) {
      themeSelect.value = theme;
    }
  }

  private initKeyboardShortcuts(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && !document.querySelector('dialog[open]')) {
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        this.setLayout('grid');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        this.setLayout('bento');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        this.setLayout('compact');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this.configEditor?.open();
      }
    });
  }

  private async loadData(): Promise<void> {
    await Promise.all([this.loadConfig(), this.updateServerHealth(), this.pollServiceHealth()]);
  }

  private async updateServerHealth(): Promise<void> {
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error('Health check failed');
      const data: ServerHealthResponse = await res.json();

      const statsPill = document.getElementById('server-stats-text');
      const statusDot = document.querySelector('.status-dot');
      const footerMem = document.getElementById('footer-memory');
      const footerVer = document.getElementById('footer-version');

      if (statsPill) statsPill.textContent = `v${data.version} • ${data.memoryUsageMb} MB RAM`;
      if (footerMem) footerMem.textContent = `Memory: ${data.memoryUsageMb} MB • Uptime: ${data.uptimeSeconds}s`;
      if (footerVer) footerVer.textContent = `DashPark v${data.version}`;
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

  private async pollServiceHealth(): Promise<void> {
    try {
      const res = await fetch('/api/v1/health/services');
      if (!res.ok) return;
      const data: { services: Record<string, ServiceHealthData> } = await res.json();

      Object.entries(data.services || {}).forEach(([id, result]) => {
        this.healthDataMap.set(id, result);
        this.updateServiceBadgeInDom(id, result);
      });
    } catch {
      // Ignore background poll errors
    }
  }

  private updateServiceBadgeInDom(serviceId: string, result: ServiceHealthData): void {
    const badges = document.querySelectorAll<HTMLElement>(`[data-health-badge="${serviceId}"]`);
    badges.forEach((badge) => {
      badge.className = `service-latency-badge ${result.status}`;
      if (result.status === 'online') {
        badge.textContent = `${result.latencyMs}ms`;
      } else if (result.status === 'degraded') {
        badge.textContent = `${result.latencyMs}ms`;
      } else if (result.status === 'offline') {
        badge.textContent = 'Offline';
      }
    });

    const dots = document.querySelectorAll<HTMLElement>(`[data-status-dot="${serviceId}"]`);
    dots.forEach((dot) => {
      dot.className = `service-status-dot ${result.status}`;
    });
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
        this.renderTagFilterBar(data.config.categories);
        this.renderContent();
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

  private renderTagFilterBar(categories: Category[]): void {
    const bar = document.getElementById('tag-filter-bar');
    if (!bar) return;

    const allTags = new Set<string>();
    categories.forEach((c) => {
      c.services.forEach((s) => {
        (s.tags || []).forEach((t) => allTags.add(t.toLowerCase()));
      });
    });

    if (allTags.size === 0) {
      bar.innerHTML = '';
      return;
    }

    const tagList = Array.from(allTags).sort();
    bar.innerHTML = `
      <span class="tag-pill ${!this.activeTag ? 'active' : ''}" data-tag="">All</span>
      ${tagList
        .map(
          (t) =>
            `<span class="tag-pill ${this.activeTag === t ? 'active' : ''}" data-tag="${this.escapeHtml(t)}">#${this.escapeHtml(t)}</span>`
        )
        .join('')}
    `;

    bar.querySelectorAll<HTMLElement>('.tag-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const tag = pill.getAttribute('data-tag') || null;
        this.activeTag = tag;
        bar.querySelectorAll('.tag-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.filterServices();
      });
    });
  }

  private renderContent(): void {
    const categories = this.configResponse?.config?.categories || [];
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

    if (this.currentLayout === 'bento') {
      this.renderBentoLayout(categories, container);
    } else if (this.currentLayout === 'compact') {
      this.renderCompactLayout(categories, container);
    } else {
      this.renderCategorizedLayout(categories, container);
    }

    this.filterServices();
  }

  /* 1. Categorized Grid Layout */
  private renderCategorizedLayout(categories: Category[], container: HTMLElement): void {
    container.innerHTML = categories
      .map((cat) => {
        const isCollapsed = this.collapsedCategories.has(cat.id);
        const catSvg = getSvgIcon(cat.icon);

        return `
          <section class="category-section ${isCollapsed ? 'collapsed' : ''}" data-category-id="${cat.id}">
            <div class="category-header" onclick="window.__dashParkToggleCategory('${cat.id}')">
              <div class="category-title-group">
                <div class="category-icon-box">${catSvg}</div>
                <h2 class="category-title">${this.escapeHtml(cat.name)}</h2>
                <span class="category-count">${cat.services.length}</span>
              </div>
              <div class="category-chevron">${SVG_ICONS.chevronDown}</div>
            </div>
            <div class="service-grid">
              ${cat.services.map((svc) => this.renderStandardServiceCard(svc, cat.icon)).join('')}
            </div>
          </section>
        `;
      })
      .join('');

    window.__dashParkToggleCategory = (id: string) => {
      if (this.collapsedCategories.has(id)) {
        this.collapsedCategories.delete(id);
      } else {
        this.collapsedCategories.add(id);
      }
      const sec = document.querySelector(`[data-category-id="${id}"]`);
      if (sec) {
        sec.classList.toggle('collapsed', this.collapsedCategories.has(id));
      }
    };
  }

  /* 2. Bento Grid Layout */
  private renderBentoLayout(categories: Category[], container: HTMLElement): void {
    const allServices: Array<{ service: ServiceItem; categoryName: string; categoryIcon?: string }> = [];
    categories.forEach((cat) => {
      cat.services.forEach((s) => {
        allServices.push({ service: s, categoryName: cat.name, categoryIcon: cat.icon });
      });
    });

    container.innerHTML = `
      <div class="layout-bento-container">
        ${allServices
          .map(({ service, categoryName, categoryIcon }, index) => {
            const isHero = index === 0 || index === 4 || index === 7;
            const health = this.healthDataMap.get(service.id);
            const status = health?.status || 'pending';
            const latencyStr = health ? `${health.latencyMs}ms` : 'Ping';

            const iconHtml = globalIconResolver.renderIcon({
              serviceName: service.name,
              iconIdentifier: service.icon,
              serviceUrl: service.url,
              categoryIcon,
              size: isHero ? 50 : 44,
            });

            return `
              <a 
                href="${this.escapeHtml(service.url)}" 
                target="${service.target || '_blank'}" 
                rel="noopener noreferrer"
                class="bento-card ${isHero ? 'hero-card' : ''}"
                data-service-name="${this.escapeHtml(service.name.toLowerCase())}"
                data-service-desc="${this.escapeHtml((service.description || '').toLowerCase())}"
                data-service-tags="${this.escapeHtml((service.tags || []).join(' ').toLowerCase())}"
              >
                <div class="bento-top-row">
                  ${iconHtml}
                  <div class="bento-meta">
                    <span class="service-latency-badge ${status}" data-health-badge="${service.id}">${latencyStr}</span>
                    <span class="bento-category-badge">${this.escapeHtml(categoryName)}</span>
                    <span class="service-status-dot ${status}" data-status-dot="${service.id}"></span>
                  </div>
                </div>
                <div class="bento-bottom-row">
                  <h3 class="bento-title">${this.escapeHtml(service.name)}</h3>
                  ${service.description ? `<p class="bento-desc">${this.escapeHtml(service.description)}</p>` : ''}
                </div>
              </a>
            `;
          })
          .join('')}
      </div>
    `;
  }

  /* 3. Compact List Layout */
  private renderCompactLayout(categories: Category[], container: HTMLElement): void {
    const allServices: Array<{ service: ServiceItem; categoryName: string; categoryIcon?: string }> = [];
    categories.forEach((cat) => {
      cat.services.forEach((s) => {
        allServices.push({ service: s, categoryName: cat.name, categoryIcon: cat.icon });
      });
    });

    container.innerHTML = `
      <div class="compact-list-wrapper">
        <table class="compact-table">
          <thead>
            <tr>
              <th style="width: 35%;">Service</th>
              <th style="width: 20%;">Category</th>
              <th style="width: 25%;">Destination URL</th>
              <th style="width: 20%; text-align: right;">Latency & Status</th>
            </tr>
          </thead>
          <tbody>
            ${allServices
              .map(({ service, categoryName, categoryIcon }) => {
                const health = this.healthDataMap.get(service.id);
                const status = health?.status || 'pending';
                const latencyStr = health ? `${health.latencyMs}ms` : '---';

                const iconHtml = globalIconResolver.renderIcon({
                  serviceName: service.name,
                  iconIdentifier: service.icon,
                  serviceUrl: service.url,
                  categoryIcon,
                  size: 28,
                });

                return `
                  <tr 
                    class="compact-row"
                    onclick="window.open('${this.escapeHtml(service.url)}', '${service.target || '_blank'}')"
                    data-service-name="${this.escapeHtml(service.name.toLowerCase())}"
                    data-service-desc="${this.escapeHtml((service.description || '').toLowerCase())}"
                    data-service-tags="${this.escapeHtml((service.tags || []).join(' ').toLowerCase())}"
                  >
                    <td>
                      <div class="compact-name-cell">
                        ${iconHtml}
                        <span>${this.escapeHtml(service.name)}</span>
                      </div>
                    </td>
                    <td>
                      <span class="bento-category-badge">${this.escapeHtml(categoryName)}</span>
                    </td>
                    <td>
                      <a href="${this.escapeHtml(service.url)}" class="compact-url-link" onclick="event.stopPropagation();" target="_blank">
                        ${this.escapeHtml(service.url)}
                      </a>
                    </td>
                    <td style="text-align: right;">
                      <span class="service-latency-badge ${status}" data-health-badge="${service.id}">
                        <span class="service-status-dot ${status}" data-status-dot="${service.id}" style="width: 5px; height: 5px;"></span>
                        ${latencyStr}
                      </span>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderStandardServiceCard(svc: ServiceItem, categoryIcon?: string): string {
    const health = this.healthDataMap.get(svc.id);
    const status = health?.status || 'pending';
    const latencyStr = health ? `${health.latencyMs}ms` : 'Ping';

    const iconHtml = globalIconResolver.renderIcon({
      serviceName: svc.name,
      iconIdentifier: svc.icon,
      serviceUrl: svc.url,
      categoryIcon,
      size: 44,
    });

    const tagsHtml = (svc.tags || [])
      .slice(0, 2)
      .map((t) => `<span class="card-tag">#${this.escapeHtml(t)}</span>`)
      .join('');

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
        ${iconHtml}
        <div class="service-content">
          <div class="service-header-row">
            <h3 class="service-name">${this.escapeHtml(svc.name)}</h3>
            <span class="service-latency-badge ${status}" data-health-badge="${svc.id}">${latencyStr}</span>
          </div>
          ${svc.description ? `<p class="service-desc">${this.escapeHtml(svc.description)}</p>` : ''}
          ${tagsHtml ? `<div class="service-tags-row">${tagsHtml}</div>` : ''}
        </div>
      </a>
    `;
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

  private filterServices(): void {
    const cards = document.querySelectorAll<HTMLElement>('.service-card, .bento-card, .compact-row');
    const sections = document.querySelectorAll<HTMLElement>('.category-section');

    cards.forEach((card) => {
      const name = card.getAttribute('data-service-name') || '';
      const desc = card.getAttribute('data-service-desc') || '';
      const tags = card.getAttribute('data-service-tags') || '';

      const matchesSearch =
        !this.searchTerm ||
        name.includes(this.searchTerm) ||
        desc.includes(this.searchTerm) ||
        tags.includes(this.searchTerm);

      const matchesTag = !this.activeTag || tags.includes(this.activeTag);
      const isVisible = matchesSearch && matchesTag;

      if (card.tagName === 'TR') {
        card.style.display = isVisible ? 'table-row' : 'none';
      } else {
        card.style.display = isVisible ? 'flex' : 'none';
      }
    });

    sections.forEach((section) => {
      const visibleCards = section.querySelectorAll(
        '.service-card[style*="display: flex"], .service-card:not([style*="display: none"])'
      );
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
