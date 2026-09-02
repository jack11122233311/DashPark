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
import { ChartWidget } from './widgets/ChartWidget.js';
import { PageRouter } from './pages/PageRouter.js';
import { BentoStudio } from './bento/BentoStudio.js';
import { stringify as stringifyYaml } from 'yaml';

// Extend window for global icon fallback callbacks, shortcuts, and bento controls
declare global {
  interface Window {
    __dashParkIconLoaded?: (img: HTMLImageElement) => void;
    __dashParkIconError?: (img: HTMLImageElement) => void;
    __dashParkToggleCategory?: (id: string) => void;
    __dashParkOpenShortcut?: (e: MouseEvent, url: string, target?: string) => void;
    __dashParkCycleTileSpan?: (e: MouseEvent, serviceId: string) => void;
    __dashParkCycleTelemetry?: (e: MouseEvent, serviceId: string) => void;
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

interface WidgetData {
  serviceId: string;
  value: string | number;
  label?: string;
  unit?: string;
}

class DashParkClient {
  public configResponse: ConfigResponse | null = null;
  private searchTerm: string = '';
  private activeTag: string | null = null;
  private currentLayout: LayoutMode = 'grid';
  private currentTheme: ThemeName = 'dark';
  private collapsedCategories: Set<string> = new Set();
  private healthDataMap: Map<string, ServiceHealthData> = new Map();
  private latencyHistoryMap: Map<string, number[]> = new Map();
  private widgetDataMap: Map<string, WidgetData> = new Map();
  private widgetPollTimers: Map<string, NodeJS.Timeout> = new Map();

  public systemWidget: SystemWidget | null = null;
  public configEditor: ConfigEditor | null = null;
  public pageRouter: PageRouter | null = null;
  public bentoStudio: BentoStudio | null = null;

  constructor() {
    this.initGlobalIconHandlers();
    this.loadPreferences();
    this.initClock();
    this.initSearch();
    this.initLayoutSwitcher();
    this.initThemeSelector();
    this.initPageRouter();
    this.initBentoStudio();
    this.initEditor();
    this.initKeyboardShortcuts();
    this.initSystemWidget();

    window.__dashParkOpenShortcut = (e: MouseEvent, url: string, target?: string) => {
      e.stopPropagation();
      e.preventDefault();
      window.open(url, target || '_blank');
    };

    window.__dashParkCycleTileSpan = (e: MouseEvent, serviceId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const service = this.findServiceById(serviceId);
      if (service && this.bentoStudio) {
        this.bentoStudio.cycleTileSpan(service);
        this.renderContent();
        this.saveCurrentConfig();
      }
    };

    window.__dashParkCycleTelemetry = (e: MouseEvent, serviceId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const service = this.findServiceById(serviceId);
      if (service && this.bentoStudio) {
        this.bentoStudio.cycleTelemetryMode(service);
        this.renderContent();
        this.saveCurrentConfig();
      }
    };

    this.loadData();

    // Poll server health & service statuses periodically
    setInterval(() => this.updateServerHealth(), 10000);
    setInterval(() => this.pollServiceHealth(), 15000);
  }

  private initPageRouter(): void {
    this.pageRouter = new PageRouter((_pageId) => {
      this.renderContent();
    });
  }

  private initBentoStudio(): void {
    this.bentoStudio = new BentoStudio(
      (reorderedServices) => {
        this.updateActivePageServices(reorderedServices);
      },
      async () => {
        await this.saveCurrentConfig();
      }
    );

    const editBentoBtn = document.getElementById('btn-edit-bento');
    editBentoBtn?.addEventListener('click', async () => {
      if (!this.bentoStudio) return;
      const isEditing = this.bentoStudio.toggleEditMode();
      editBentoBtn.classList.toggle('active', isEditing);
      editBentoBtn.innerHTML = isEditing ? '<span>💾 Done (Save)</span>' : '<span>✏️ Customize</span>';
      
      this.renderContent();

      if (!isEditing) {
        await this.saveCurrentConfig();
      }
    });
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
      const meta = this.configResponse?.config?.meta;
      const is12h = meta?.clockFormat === '12h';
      const showSeconds = meta?.showSeconds !== false;
      const showDate = meta?.showDate !== false;

      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('en-US', {
          hour12: is12h,
          hour: '2-digit',
          minute: '2-digit',
          second: showSeconds ? '2-digit' : undefined,
        });
      }
      if (dateEl) {
        if (showDate) {
          dateEl.style.display = 'block';
          dateEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
        } else {
          dateEl.style.display = 'none';
        }
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

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) return;

        const meta = this.configResponse?.config?.meta;
        const provider = meta?.searchEngine?.provider || 'duckduckgo';
        let searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

        if (provider === 'google') {
          searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        } else if (provider === 'brave') {
          searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
        } else if (provider === 'searxng') {
          searchUrl = meta?.searchEngine?.customUrl
            ? `${meta.searchEngine.customUrl.replace('%s', encodeURIComponent(query))}`
            : `https://searx.be/search?q=${encodeURIComponent(query)}`;
        } else if (provider === 'custom' && meta?.searchEngine?.customUrl) {
          searchUrl = meta.searchEngine.customUrl.replace('%s', encodeURIComponent(query));
        }

        window.open(searchUrl, '_blank');
      }
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
      if (statsPill) statsPill.textContent = 'DashPark • Offline';
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

        // Record latency history for sparklines
        const history = this.latencyHistoryMap.get(id) || [];
        if (result.status === 'online' || result.status === 'degraded') {
          history.push(result.latencyMs);
          if (history.length > 10) history.shift();
          this.latencyHistoryMap.set(id, history);
        }

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

    // Render sparklines dynamically based on container type
    const sparkContainers = document.querySelectorAll<HTMLElement>(`[data-sparkline="${serviceId}"]`);
    const history = this.latencyHistoryMap.get(serviceId);
    if (history && history.length >= 2) {
      sparkContainers.forEach((container) => {
        const isBento = container.classList.contains('bento-telemetry-slot');
        const w = isBento ? 120 : 80;
        const h = isBento ? 34 : 22;
        ChartWidget.renderSparkline(container, [], history, '#10b981', w, h);
      });
    }
  }

  private startWidgetPollers(categories: Category[]): void {
    // Clear existing timers
    this.widgetPollTimers.forEach((timer) => clearInterval(timer));
    this.widgetPollTimers.clear();

    categories.forEach((cat) => {
      cat.services.forEach((svc) => {
        if (svc.widget && svc.widget.enabled !== false && svc.widget.url) {
          const poll = async () => {
            try {
              const query = new URLSearchParams({
                url: svc.widget!.url!,
                jsonPath: svc.widget!.jsonPath || '',
                headers: JSON.stringify(svc.widget!.headers || {}),
              });

              const res = await fetch(`/api/v1/widgets/proxy?${query.toString()}`);
              if (!res.ok) return;
              const data = await res.json();

              if (data.success && data.value !== undefined) {
                this.widgetDataMap.set(svc.id, {
                  serviceId: svc.id,
                  value: data.value,
                  label: svc.widget?.label,
                  unit: svc.widget?.unit,
                });
                this.updateWidgetBadgeInDom(svc.id, data.value, svc.widget?.label, svc.widget?.unit);
              }
            } catch {
              // Ignore widget poll errors
            }
          };

          // Immediate poll
          poll();
          const intervalMs = (svc.widget.refreshIntervalSeconds || 30) * 1000;
          this.widgetPollTimers.set(svc.id, setInterval(poll, intervalMs));
        }
      });
    });
  }

  private updateWidgetBadgeInDom(serviceId: string, value: any, label?: string, unit?: string): void {
    const badges = document.querySelectorAll<HTMLElement>(`[data-widget-badge="${serviceId}"]`);
    const formatted = `${label ? label + ': ' : ''}${value}${unit || ''}`;
    badges.forEach((badge) => {
      badge.textContent = formatted;
      badge.style.display = 'inline-flex';
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
        const categories = this.pageRouter?.getActiveCategories(data.config) || data.config.categories || [];
        this.renderTagFilterBar(categories);
        this.renderContent();
        this.startWidgetPollers(categories);
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

    if (meta.theme) {
      this.applyTheme(meta.theme);
    }

    if (meta.layout && ['grid', 'bento', 'compact'].includes(meta.layout)) {
      this.setLayout(meta.layout);
    }

    // Wallpaper & Live Glassmorphism
    if (meta.backgroundUrl && meta.backgroundUrl.trim().length > 0) {
      document.body.classList.add('has-custom-wallpaper');
      document.documentElement.style.setProperty('--bg-custom-image', `url("${meta.backgroundUrl}")`);
      document.documentElement.style.setProperty('--glass-blur', `${meta.glassBlur ?? 12}px`);
      document.documentElement.style.setProperty('--glass-opacity', String(meta.glassOpacity ?? 0.75));
    } else {
      document.body.classList.remove('has-custom-wallpaper');
      document.documentElement.style.removeProperty('--bg-custom-image');
    }

    // Search Engine Configuration
    const searchContainer = document.getElementById('search-container');
    if (searchContainer) {
      searchContainer.style.display = meta.searchEngine?.enabled === false ? 'none' : 'flex';
    }

    // Clock Visibility
    const clockContainer = document.getElementById('clock-container');
    if (clockContainer) {
      clockContainer.style.display = meta.showClock === false ? 'none' : 'flex';
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
    const config = this.configResponse?.config;
    const pageTabsContainer = document.getElementById('page-tabs-bar');
    this.pageRouter?.renderPageTabs(config || null, pageTabsContainer);

    const categories = this.pageRouter?.getActiveCategories(config || null) || [];
    const container = document.getElementById('categories-container');
    const editBentoBtn = document.getElementById('btn-edit-bento');

    if (editBentoBtn) {
      editBentoBtn.style.display = this.currentLayout === 'bento' ? 'inline-flex' : 'none';
    }

    if (!container) return;

    if (categories.length === 0) {
      container.innerHTML = `
        <div class="loading-state">
          <p>No categories or services defined in this page.</p>
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

  /* 2. Bento Grid Layout & Studio */
  private renderBentoLayout(categories: Category[], container: HTMLElement): void {
    const allServices: Array<{ service: ServiceItem; categoryName: string; categoryIcon?: string }> = [];
    categories.forEach((cat) => {
      cat.services.forEach((s) => {
        allServices.push({ service: s, categoryName: cat.name, categoryIcon: cat.icon });
      });
    });

    const isEditMode = this.bentoStudio?.isEditMode || false;
    container.classList.toggle('bento-edit-mode', isEditMode);

    container.innerHTML = `
      <div class="layout-bento-container ${isEditMode ? 'bento-edit-mode' : ''}">
        ${allServices
          .map(({ service, categoryName, categoryIcon }) => {
            const health = this.healthDataMap.get(service.id);
            const status = health?.status || 'pending';
            const latencyStr = health ? `${health.latencyMs}ms` : 'Ping';
            const widgetData = this.widgetDataMap.get(service.id);
            const showGraph = service.widget?.enabled !== false && service.widget?.showGraph !== false;
            const spanClass = `span-${service.bentoSpan || '1x1'}`;
            const isHero = service.bentoSpan === '2x1' || service.bentoSpan === '2x2';

            const iconHtml = globalIconResolver.renderIcon({
              serviceName: service.name,
              iconIdentifier: service.icon,
              serviceUrl: service.url,
              categoryIcon,
              size: isHero ? 50 : 44,
            });

            const shortcutsHtml = (service.shortcuts || []).length > 0
              ? `<div class="service-shortcuts-row">
                  ${service.shortcuts!
                    .map(
                      (sc) =>
                        `<span class="service-shortcut-chip" onclick="window.__dashParkOpenShortcut(event, '${this.escapeHtml(sc.url)}', '${sc.target || '_blank'}')">${this.escapeHtml(sc.name)}</span>`
                    )
                    .join('')}
                </div>`
              : '';

            const editToolbarHtml = isEditMode
              ? `<div class="bento-tile-toolbar">
                  <button type="button" class="bento-tile-btn" onclick="window.__dashParkCycleTileSpan(event, '${service.id}')" title="Cycle tile size">
                    📐 ${service.bentoSpan || '1x1'}
                  </button>
                  <button type="button" class="bento-tile-btn" onclick="window.__dashParkCycleTelemetry(event, '${service.id}')" title="Toggle graph/stat display">
                    📊 ${showGraph ? 'Graph' : service.widget?.enabled !== false ? 'Stat' : 'Off'}
                  </button>
                </div>`
              : '';

            return `
              <a 
                href="${isEditMode ? 'javascript:void(0)' : this.escapeHtml(service.url)}" 
                target="${service.target || '_blank'}" 
                rel="noopener noreferrer"
                class="bento-card ${spanClass}"
                data-service-id="${service.id}"
                data-service-name="${this.escapeHtml(service.name.toLowerCase())}"
                data-service-desc="${this.escapeHtml((service.description || '').toLowerCase())}"
                data-service-tags="${this.escapeHtml((service.tags || []).join(' ').toLowerCase())}"
              >
                ${editToolbarHtml}
                <div class="bento-top-row">
                  ${iconHtml}
                  <div class="bento-meta">
                    ${showGraph ? `<div class="service-sparkline-box bento-telemetry-slot" data-sparkline="${service.id}"></div>` : ''}
                    <span class="service-latency-badge ${status}" data-health-badge="${service.id}">${latencyStr}</span>
                    <span class="bento-category-badge">${this.escapeHtml(categoryName)}</span>
                    <span class="service-status-dot ${status}" data-status-dot="${service.id}"></span>
                  </div>
                </div>
                <div class="bento-bottom-row">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                    <h3 class="bento-title">${this.escapeHtml(service.name)}</h3>
                    <span 
                      class="service-widget-badge" 
                      data-widget-badge="${service.id}" 
                      style="${widgetData ? 'display: inline-flex;' : 'display: none;'}"
                    >
                      ${widgetData ? `${widgetData.label ? widgetData.label + ': ' : ''}${widgetData.value}${widgetData.unit || ''}` : ''}
                    </span>
                  </div>
                  ${service.description ? `<p class="bento-desc">${this.escapeHtml(service.description)}</p>` : ''}
                  ${shortcutsHtml}
                </div>
              </a>
            `;
          })
          .join('')}
      </div>
    `;

    if (isEditMode && this.bentoStudio) {
      this.bentoStudio.attachDragAndDrop(container, allServices);
    }
  }

  public findServiceById(serviceId: string): ServiceItem | null {
    if (!this.configResponse?.config) return null;
    const config = this.configResponse.config;

    // Check in pages if present
    if (config.pages && config.pages.length > 0) {
      for (const page of config.pages) {
        for (const cat of page.categories) {
          const svc = cat.services.find((s) => s.id === serviceId);
          if (svc) return svc;
        }
      }
    }

    // Check in root categories
    for (const cat of config.categories || []) {
      const svc = cat.services.find((s) => s.id === serviceId);
      if (svc) return svc;
    }

    return null;
  }

  public updateActivePageServices(reorderedServices: ServiceItem[]): void {
    if (!this.configResponse?.config) return;
    const config = this.configResponse.config;
    const activePageId = this.pageRouter?.getActivePageId() || 'home';

    // Map existing services to their target order
    const serviceMap = new Map<string, ServiceItem>();
    reorderedServices.forEach((s) => serviceMap.set(s.id, s));

    const sortCategoryServices = (categories: Category[]) => {
      categories.forEach((cat) => {
        cat.services.sort((a, b) => {
          const idxA = reorderedServices.findIndex((s) => s.id === a.id);
          const idxB = reorderedServices.findIndex((s) => s.id === b.id);
          if (idxA === -1 || idxB === -1) return 0;
          return idxA - idxB;
        });
      });
    };

    if (config.pages && config.pages.length > 0) {
      const activePage = config.pages.find((p) => p.id === activePageId) || config.pages[0];
      if (activePage) sortCategoryServices(activePage.categories);
    } else if (config.categories) {
      sortCategoryServices(config.categories);
    }
  }

  public async saveCurrentConfig(): Promise<void> {
    if (!this.configResponse?.config) return;

    try {
      const configToSerialize = JSON.parse(JSON.stringify(this.configResponse.config));
      if (configToSerialize.pages && configToSerialize.pages.length > 0) {
        delete configToSerialize.categories;
      }
      const yamlContent = stringifyYaml(configToSerialize);
      const res = await fetch('/api/v1/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: yamlContent }),
      });
      if (res.ok) {
        await this.loadConfig();
      }
    } catch (err) {
      console.error('[DashPark] Failed to auto-save layout:', err);
    }
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
              <th style="width: 30%;">Service</th>
              <th style="width: 15%;">Category</th>
              <th style="width: 25%;">Destination URL</th>
              <th style="width: 30%; text-align: right;">Latency, Shortcuts & Badges</th>
            </tr>
          </thead>
          <tbody>
            ${allServices
              .map(({ service, categoryName, categoryIcon }) => {
                const health = this.healthDataMap.get(service.id);
                const status = health?.status || 'pending';
                const latencyStr = health ? `${health.latencyMs}ms` : '---';
                const widgetData = this.widgetDataMap.get(service.id);

                const iconHtml = globalIconResolver.renderIcon({
                  serviceName: service.name,
                  iconIdentifier: service.icon,
                  serviceUrl: service.url,
                  categoryIcon,
                  size: 28,
                });

                const shortcutsInline = (service.shortcuts || [])
                  .map(
                    (sc) =>
                      `<span class="service-shortcut-chip" style="padding: 0.1rem 0.35rem; font-size: 0.625rem;" onclick="window.__dashParkOpenShortcut(event, '${this.escapeHtml(sc.url)}', '${sc.target || '_blank'}')">${this.escapeHtml(sc.name)}</span>`
                  )
                  .join('');

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
                      <div style="display: inline-flex; align-items: center; gap: 0.4rem; justify-content: flex-end; flex-wrap: wrap;">
                        ${shortcutsInline}
                        <span 
                          class="service-widget-badge" 
                          data-widget-badge="${service.id}" 
                          style="${widgetData ? 'display: inline-flex;' : 'display: none;'}"
                        >
                          ${widgetData ? `${widgetData.label ? widgetData.label + ': ' : ''}${widgetData.value}${widgetData.unit || ''}` : ''}
                        </span>
                        <span class="service-latency-badge ${status}" data-health-badge="${service.id}">
                          <span class="service-status-dot ${status}" data-status-dot="${service.id}" style="width: 5px; height: 5px;"></span>
                          ${latencyStr}
                        </span>
                      </div>
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
    const widgetData = this.widgetDataMap.get(svc.id);
    const showGraph = svc.widget?.enabled !== false && svc.widget?.showGraph !== false;

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

    const shortcutsHtml = (svc.shortcuts || []).length > 0
      ? `<div class="service-shortcuts-row">
          ${svc.shortcuts!
            .map(
              (sc) =>
                `<span class="service-shortcut-chip" onclick="window.__dashParkOpenShortcut(event, '${this.escapeHtml(sc.url)}', '${sc.target || '_blank'}')">${this.escapeHtml(sc.name)}</span>`
            )
            .join('')}
        </div>`
      : '';

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
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              ${showGraph ? `<div class="service-sparkline-box grid-sparkline-slot" data-sparkline="${svc.id}"></div>` : ''}
              <span class="service-latency-badge ${status}" data-health-badge="${svc.id}">${latencyStr}</span>
            </div>
          </div>
          ${svc.description ? `<p class="service-desc">${this.escapeHtml(svc.description)}</p>` : ''}
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.4rem;">
            ${tagsHtml ? `<div class="service-tags-row" style="margin-top: 0;">${tagsHtml}</div>` : '<div></div>'}
            <span 
              class="service-widget-badge" 
              data-widget-badge="${svc.id}" 
              style="${widgetData ? 'display: inline-flex;' : 'display: none;'}"
            >
              ${widgetData ? `${widgetData.label ? widgetData.label + ': ' : ''}${widgetData.value}${widgetData.unit || ''}` : ''}
            </span>
          </div>
          ${shortcutsHtml}
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
