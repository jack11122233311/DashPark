import type {
  ConfigResponse,
  Category,
  ServiceItem,
  ServerHealthResponse,
  DashboardMeta,
  ErrorDiagnostic,
  LayoutMode,
  ThemeName,
} from '../shared/types.js';
import { globalIconResolver } from './icons/IconResolver.js';
import { SystemWidget } from './widgets/SystemWidget.js';
import { ConfigEditor } from './editor/ConfigEditor.js';
import { PageRouter } from './pages/PageRouter.js';
import { BentoStudio } from './bento/BentoStudio.js';
import { FloatingDock } from './dock/FloatingDock.js';
import { CommandPalette } from './command/CommandPalette.js';
import { ToastManager } from './notifications/ToastManager.js';
import { QuickAddModal } from './quickadd/QuickAddModal.js';
import { KioskRotator } from './kiosk/KioskRotator.js';
import { SpatialNavigator } from './navigation/SpatialNavigator.js';
import { PreferenceStore } from './state/PreferenceStore.js';
import { DomRenderer } from './dom/DomRenderer.js';
import { HealthPoller } from './services/HealthPoller.js';
import { WidgetPoller } from './services/WidgetPoller.js';
import { SearchEngineBar } from './search/SearchEngineBar.js';
import { RssWidget } from './widgets/RssWidget.js';
import { HostStatsCard } from './widgets/HostStatsCard.js';
import { ScratchpadWidget } from './widgets/ScratchpadWidget.js';
import { getSvgIcon, SVG_ICONS } from './icons/lucide-svgs.js';
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

export class DashParkClient {
  public configResponse: ConfigResponse | null = null;
  private searchTerm: string = '';
  private activeTag: string | null = null;
  private currentLayout: LayoutMode = 'grid';
  private currentTheme: ThemeName = 'dark';
  private collapsedCategories: Set<string> = new Set();

  public systemWidget: SystemWidget | null = null;
  public configEditor: ConfigEditor | null = null;
  public pageRouter: PageRouter | null = null;
  public bentoStudio: BentoStudio | null = null;
  public floatingDock: FloatingDock | null = null;
  public commandPalette: CommandPalette | null = null;
  public toastManager: ToastManager | null = null;
  public quickAddModal: QuickAddModal | null = null;
  public kioskRotator: KioskRotator | null = null;
  public spatialNavigator: SpatialNavigator | null = null;
  public healthPoller: HealthPoller | null = null;
  public widgetPoller: WidgetPoller | null = null;
  public searchEngineBar: SearchEngineBar | null = null;
  public rssWidget: RssWidget | null = null;
  public hostStatsCard: HostStatsCard | null = null;
  public scratchpadWidget: ScratchpadWidget | null = null;

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
    this.initServicesAndEnhancements();
    this.initFloatingDock();
    this.initCommandPalette();
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

    // Poll server health & start poller
    setInterval(() => this.updateServerHealth(), 10000);
    this.healthPoller?.start();
  }

  private initServicesAndEnhancements(): void {
    this.toastManager = new ToastManager();
    this.spatialNavigator = new SpatialNavigator();
    this.widgetPoller = new WidgetPoller();
    this.searchEngineBar = new SearchEngineBar({
      onPopupBlocked: (url) => {
        window.open(url, '_blank');
        this.toastManager?.show({
          title: 'Popup Blocked',
          message: 'Opened in a new tab. Please allow popups for window/display placement.',
          type: 'degraded',
        });
      },
    });
    this.hostStatsCard = new HostStatsCard();
    this.hostStatsCard.init();
    this.rssWidget = new RssWidget();
    this.rssWidget.init();
    this.scratchpadWidget = new ScratchpadWidget();
    this.scratchpadWidget.init();

    this.healthPoller = new HealthPoller({
      toastManager: this.toastManager,
      getServiceName: (id) => this.findServiceById(id)?.name || id,
      onFilterOffline: () => this.filterOfflineOnly(),
    });

    this.quickAddModal = new QuickAddModal({
      getConfig: () => this.configResponse?.config || null,
      onServiceAdded: async (newService, categoryId) => {
        if (!this.configResponse?.config) return;
        const config = this.configResponse.config;
        const activePageId = this.pageRouter?.getActivePageId() || 'home';
        let targetCat: Category | undefined;

        if (config.pages && config.pages.length > 0) {
          const page = config.pages.find((p) => p.id === activePageId) || config.pages[0];
          targetCat = page.categories.find((c) => c.id === categoryId) || page.categories[0];
        } else if (config.categories) {
          targetCat = config.categories.find((c) => c.id === categoryId) || config.categories[0];
        }

        if (targetCat) {
          targetCat.services.push(newService);
          await this.saveCurrentConfig();
          this.toastManager?.show({
            title: 'Service Added',
            message: `${newService.name} added to ${targetCat.name}`,
            type: 'online',
          });
        }
      },
    });

    this.kioskRotator = new KioskRotator({
      getPageIds: () => (this.configResponse?.config?.pages || []).map((p) => p.id),
      onPageChange: (pageId) => {
        this.pageRouter?.setActivePageId(pageId);
        this.renderContent();
      },
    });
  }

  private initFloatingDock(): void {
    this.floatingDock = new FloatingDock({
      onLayoutSelect: (layout) => this.setLayout(layout),
      onThemeSelect: (theme) => {
        this.applyTheme(theme);
        PreferenceStore.setTheme(theme);
      },
      onOpenSettings: async () => {
        const ok = await this.challengePin();
        if (ok) {
          this.configEditor?.open();
        }
      },
      onOpenCommandPalette: () => this.commandPalette?.open(),
      onQuickAdd: () => this.quickAddModal?.open(),
      onToggleKiosk: () => {
        const active = this.kioskRotator?.toggle();
        this.floatingDock?.setKioskActive(!!active);
        this.toastManager?.show({
          title: active ? 'Kiosk Wallboard Enabled' : 'Kiosk Wallboard Paused',
          message: active ? 'Cycling across dashboard pages' : 'Returned to interactive view',
          type: 'info',
        });
      },
      onToggleBentoCustomize: async () => {
        const ok = await this.challengePin();
        if (!ok) return;

        const isEditing = this.bentoStudio?.toggleEditMode();
        this.floatingDock?.setBentoEditing(!!isEditing);
        this.renderContent();

        if (!isEditing) {
          await this.saveCurrentConfig();
        }
      },
      getCurrentLayout: () => this.currentLayout,
      getCurrentTheme: () => this.currentTheme,
    });
    this.floatingDock.init();
  }

  private initCommandPalette(): void {
    this.commandPalette = new CommandPalette({
      getConfig: () => this.configResponse?.config || null,
      onLayoutSelect: (layout) => this.setLayout(layout),
      onThemeSelect: (theme) => {
        this.applyTheme(theme);
        PreferenceStore.setTheme(theme);
      },
      onOpenSettings: async () => {
        const ok = await this.challengePin();
        if (ok) {
          this.configEditor?.open();
        }
      },
      onQuickAdd: () => this.quickAddModal?.open(),
      onToggleKiosk: () => {
        const active = this.kioskRotator?.toggle();
        this.floatingDock?.setKioskActive(!!active);
      },
      onOpenCheatsheet: () => {
        const cheatsheet = document.getElementById('cheatsheet-dialog') as HTMLDialogElement | null;
        cheatsheet?.showModal();
      },
      onPageSelect: (pageId) => {
        this.pageRouter?.setActivePageId(pageId);
        this.renderContent();
      },
      onSearchWeb: (q) => this.searchEngineBar?.executeSearch(q),
      onToggleBentoCustomize: async () => {
        const ok = await this.challengePin();
        if (!ok) return;

        const isEditing = this.bentoStudio?.toggleEditMode();
        this.floatingDock?.setBentoEditing(!!isEditing);
        this.renderContent();

        if (!isEditing) {
          await this.saveCurrentConfig();
        }
      },
    });

    const searchCmdBadge = document.getElementById('search-cmd-badge');
    searchCmdBadge?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.commandPalette?.open();
    });
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
      const ok = await this.challengePin();
      if (!ok) return;

      const isEditing = this.bentoStudio?.toggleEditMode();
      editBentoBtn.classList.toggle('active', !!isEditing);
      editBentoBtn.innerHTML = isEditing ? '<span>💾 Done (Save)</span>' : '<span>✏️ Customize</span>';
      this.floatingDock?.setBentoEditing(!!isEditing);
      
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
    openEditorBtn?.addEventListener('click', async () => {
      const ok = await this.challengePin();
      if (ok) {
        this.configEditor?.open();
      }
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
    this.currentLayout = PreferenceStore.getLayout('grid');
    this.currentTheme = PreferenceStore.getTheme('dark');
    this.collapsedCategories = PreferenceStore.getCollapsedCategories();
    this.applyTheme(this.currentTheme);
  }

  private async initWeather(): Promise<void> {
    const weatherContainer = document.getElementById('weather-container');
    const meta = this.configResponse?.config?.meta;

    if (!weatherContainer || meta?.weather?.enabled === false) {
      if (weatherContainer) weatherContainer.style.display = 'none';
      return;
    }

    try {
      const params = new URLSearchParams();
      if (meta?.weather?.latitude) params.set('lat', String(meta.weather.latitude));
      if (meta?.weather?.longitude) params.set('lon', String(meta.weather.longitude));
      if (meta?.weather?.units) params.set('units', meta.weather.units);
      if (meta?.weather?.city) params.set('city', meta.weather.city);

      const res = await fetch(`/api/v1/weather?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.weather) {
        const w = data.weather;
        const iconEl = document.getElementById('weather-icon');
        const tempEl = document.getElementById('weather-temp');
        const condEl = document.getElementById('weather-condition');

        const weatherIcons: Record<string, string> = {
          'Clear Sky': '☀️',
          'Mainly Clear': '🌤️',
          'Partly Cloudy': '⛅',
          'Overcast': '☁️',
          'Foggy': '🌫️',
          'Light Drizzle': '🌦️',
          'Slight Rain': '🌧️',
          'Moderate Rain': '🌧️',
          'Heavy Rain': '⛈️',
          'Slight Snow': '🌨️',
          'Thunderstorm': '⚡',
        };

        if (iconEl) iconEl.textContent = weatherIcons[w.condition] || '🌤️';
        if (tempEl) tempEl.textContent = `${w.temperature}${w.unit}`;
        if (condEl) condEl.textContent = w.condition;

        weatherContainer.style.display = 'inline-flex';
      }
    } catch {
      // Ignore weather errors
    }
  }

  public async challengePin(): Promise<boolean> {
    const meta = this.configResponse?.config?.meta;
    if (!meta?.auth?.pinHash) return true;

    const dialog = document.getElementById('pin-dialog') as HTMLDialogElement | null;
    const pinInput = document.getElementById('pin-input') as HTMLInputElement | null;
    const submitBtn = document.getElementById('pin-submit-btn');
    const cancelBtn = document.getElementById('pin-cancel-btn');

    if (!dialog || !pinInput) return true;

    pinInput.value = '';
    dialog.showModal();

    return new Promise((resolve) => {
      const cleanup = () => {
        submitBtn?.removeEventListener('click', onSubmit);
        cancelBtn?.removeEventListener('click', onCancel);
        pinInput.removeEventListener('keydown', onKeyDown);
      };

      const onSubmit = async () => {
        const pin = pinInput.value;
        try {
          const res = await fetch('/api/v1/auth/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin }),
          });
          const data = await res.json();
          if (data.authenticated) {
            cleanup();
            dialog.close();
            resolve(true);
          } else {
            pinInput.classList.add('invalid');
            pinInput.value = '';
            pinInput.placeholder = 'Wrong PIN';
            setTimeout(() => {
              pinInput.classList.remove('invalid');
              pinInput.placeholder = '••••';
            }, 1200);
          }
        } catch {
          cleanup();
          dialog.close();
          resolve(false);
        }
      };

      const onCancel = () => {
        cleanup();
        dialog.close();
        resolve(false);
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') onSubmit();
        else if (e.key === 'Escape') onCancel();
      };

      submitBtn?.addEventListener('click', onSubmit);
      cancelBtn?.addEventListener('click', onCancel);
      pinInput.addEventListener('keydown', onKeyDown);
      pinInput.focus();
    });
  }

  private initClock(): void {
    const clockEl = document.getElementById('clock-display');
    const dateEl = document.getElementById('date-display');
    const subtitleEl = document.getElementById('dashboard-subtitle');

    const update = () => {
      const now = new Date();
      const meta = this.configResponse?.config?.meta;
      const is12h = meta?.clockFormat === '12h';
      const showSeconds = meta?.showSeconds !== false;
      const showDate = meta?.showDate !== false;

      const hour = now.getHours();
      let greeting = 'Good evening';
      if (hour >= 5 && hour < 12) greeting = 'Good morning';
      else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
      else if (hour >= 22 || hour < 5) greeting = 'Good night';

      if (subtitleEl && (!meta?.subtitle || meta.subtitle === 'Homelab & Server Park')) {
        subtitleEl.textContent = `${greeting} • Homelab & Server Park`;
      }

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
    PreferenceStore.setLayout(layout);
    this.updateLayoutButtons();
    this.floatingDock?.setLayout(layout);
    if (this.configResponse?.config?.categories || this.configResponse?.config?.pages) {
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
      PreferenceStore.setTheme(theme);
    });
  }

  private applyTheme(theme: ThemeName): void {
    this.currentTheme = theme;
    document.body.className = `theme-${theme}`;
    const themeSelect = document.getElementById('theme-selector') as HTMLSelectElement | null;
    if (themeSelect && themeSelect.value !== theme) {
      themeSelect.value = theme;
    }
    this.floatingDock?.setTheme(theme);
  }

  private initKeyboardShortcuts(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.commandPalette?.open();
      } else if (e.key === '/' && document.activeElement !== searchInput && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        this.commandPalette?.open();
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
    await Promise.all([
      this.loadConfig(),
      this.updateServerHealth(),
      this.healthPoller?.poll(),
      this.initWeather(),
    ]);
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

  private filterOfflineOnly(): void {
    const cards = document.querySelectorAll<HTMLElement>('.service-card, .bento-card, .compact-row');
    cards.forEach((card) => {
      const id = card.getAttribute('data-service-id') || '';
      const health = this.healthPoller?.getHealth(id);
      const isOffline = health?.status === 'offline';
      if (card.tagName === 'TR') {
        card.style.display = isOffline ? 'table-row' : 'none';
      } else {
        card.style.display = isOffline ? 'flex' : 'none';
      }
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
        this.widgetPoller?.updateTargets(categories);
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

    if (meta.searchEngine) {
      this.searchEngineBar?.setTargetOptions({
        target: meta.searchEngine.target,
        targetScreen: meta.searchEngine.targetScreen,
        windowWidth: meta.searchEngine.windowWidth,
        windowHeight: meta.searchEngine.windowHeight,
      });
    }

    // Clock Visibility
    const clockContainer = document.getElementById('clock-container');
    if (clockContainer) {
      clockContainer.style.display = meta.showClock === false ? 'none' : 'flex';
    }
  }

  private renderTagFilterBar(categories: Category[]): void {
    const container = document.getElementById('tag-filter-bar');
    if (!container) return;

    // Collect all unique tags
    const tags = new Set<string>();
    categories.forEach((cat) => {
      cat.services.forEach((svc) => {
        (svc.tags || []).forEach((t) => tags.add(t));
      });
    });

    if (tags.size === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    const tagArray = Array.from(tags).sort();

    container.innerHTML = `
      <button type="button" class="tag-chip ${!this.activeTag ? 'active' : ''}" data-tag="">All</button>
      ${tagArray
        .map(
          (t) =>
            `<button type="button" class="tag-chip ${this.activeTag === t ? 'active' : ''}" data-tag="${DomRenderer.escapeHtml(t)}">#${DomRenderer.escapeHtml(t)}</button>`
        )
        .join('')}
    `;

    container.querySelectorAll<HTMLButtonElement>('.tag-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag') || null;
        this.activeTag = tag;
        container.querySelectorAll('.tag-chip').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterServices();
      });
    });
  }

  public renderContent(): void {
    if (!this.configResponse?.config) return;

    const config = this.configResponse.config;
    const categories = this.pageRouter?.getActiveCategories(config) || config.categories || [];
    const container = document.getElementById('categories-container');
    if (!container) return;

    // 1. Render Multi-Page Navigation Bar
    this.pageRouter?.renderTabBar('page-tabs-container', config);

    // 2. Render Active Layout
    if (this.currentLayout === 'bento') {
      this.renderBentoLayout(categories, container);
    } else if (this.currentLayout === 'compact') {
      this.renderCompactLayout(categories, container);
    } else {
      this.renderCategorizedLayout(categories, container);
    }

    this.floatingDock?.setLayout(this.currentLayout);
    this.commandPalette?.rebuildIndex();
    this.filterServices();
  }

  /* 1. Categorized Grid Layout */
  private renderCategorizedLayout(categories: Category[], container: HTMLElement): void {
    const healthMap = this.healthPoller?.getAllHealth() || new Map();

    container.innerHTML = categories
      .map((cat) => {
        const isCollapsed = this.collapsedCategories.has(cat.id);
        const catSvg = getSvgIcon(cat.icon);
        const rollup = DomRenderer.computeCategoryHealthRollup(cat.services, healthMap);

        const cardsHtml = cat.services
          .map((svc) =>
            DomRenderer.renderStandardCard(
              svc,
              cat.icon,
              this.healthPoller?.getHealth(svc.id),
              this.widgetPoller?.getWidgetData(svc.id)
            )
          )
          .join('');

        return `
          <section class="category-section ${isCollapsed ? 'collapsed' : ''}" data-category-id="${cat.id}">
            <div class="category-header" onclick="window.__dashParkToggleCategory('${cat.id}')">
              <div class="category-title-group">
                <div class="category-icon-box">${catSvg}</div>
                <h2 class="category-title">${DomRenderer.escapeHtml(cat.name)}</h2>
                <span class="category-health-rollup ${rollup.cssClass}">${rollup.text}</span>
              </div>
              <div class="category-chevron">${SVG_ICONS.chevronDown}</div>
            </div>
            <div class="service-grid">
              ${cardsHtml}
            </div>
          </section>
        `;
      })
      .join('');

    window.__dashParkToggleCategory = (id: string) => {
      const isNowCollapsed = PreferenceStore.toggleCategoryCollapsed(id);
      if (isNowCollapsed) {
        this.collapsedCategories.add(id);
      } else {
        this.collapsedCategories.delete(id);
      }
      const sec = document.querySelector(`[data-category-id="${id}"]`);
      if (sec) {
        sec.classList.toggle('collapsed', isNowCollapsed);
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

    const bentoCardsHtml = allServices
      .map(({ service, categoryName, categoryIcon }) =>
        DomRenderer.renderBentoCard(
          service,
          categoryName,
          categoryIcon,
          this.healthPoller?.getHealth(service.id),
          this.widgetPoller?.getWidgetData(service.id),
          isEditMode
        )
      )
      .join('');

    container.innerHTML = `
      <div class="layout-bento-container ${isEditMode ? 'bento-edit-mode' : ''}">
        ${bentoCardsHtml}
      </div>
    `;

    if (isEditMode && this.bentoStudio) {
      this.bentoStudio.attachDragAndDrop(container, allServices);
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

    const rowsHtml = allServices
      .map(({ service, categoryName, categoryIcon }) =>
        DomRenderer.renderCompactRow(
          service,
          categoryName,
          categoryIcon,
          this.healthPoller?.getHealth(service.id),
          this.widgetPoller?.getWidgetData(service.id)
        )
      )
      .join('');

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
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  public findServiceById(serviceId: string): ServiceItem | null {
    if (!this.configResponse?.config) return null;
    const config = this.configResponse.config;

    if (config.pages && config.pages.length > 0) {
      for (const page of config.pages) {
        for (const cat of page.categories) {
          const svc = cat.services.find((s) => s.id === serviceId);
          if (svc) return svc;
        }
      }
    }

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
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new DashParkClient();
});
