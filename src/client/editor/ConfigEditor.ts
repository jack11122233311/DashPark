import type { DashParkConfig, Category, ServiceItem, ThemeName, LayoutMode, ConfigSnapshotInfo } from '../../shared/types.js';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';
import { HOMELAB_PRESETS, detectServiceFromUrl } from './presets.js';
import { detectAndImportConfig } from './importers.js';

export class ConfigEditor {
  private dialog: HTMLDialogElement | null = null;
  private currentConfig: DashParkConfig | null = null;
  private rawYaml: string = '';
  private activeTab: 'visual' | 'settings' | 'yaml' | 'guides' = 'visual';
  private validationDebounceTimer: NodeJS.Timeout | null = null;
  private onSavedCallback: () => void;
  private activeEditingPageId: string = 'home';
  private customCssContent: string = '';
  private snapshotsList: ConfigSnapshotInfo[] = [];

  constructor(onSaved: () => void) {
    this.onSavedCallback = onSaved;
    this.initDialog();
  }

  private initDialog(): void {
    this.dialog = document.getElementById('editor-dialog') as HTMLDialogElement | null;
    if (!this.dialog) return;

    // Light dismiss when clicking outside modal
    this.dialog.addEventListener('click', (e) => {
      const rect = this.dialog?.getBoundingClientRect();
      if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
        this.close();
      }
    });

    // Close button
    const closeBtn = document.getElementById('editor-close-btn');
    closeBtn?.addEventListener('click', () => this.close());

    // Tab buttons
    const tabBtns = document.querySelectorAll<HTMLButtonElement>('.editor-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as 'visual' | 'settings' | 'yaml' | 'guides';
        if (tab) this.switchTab(tab);
      });
    });

    // Save button
    const saveBtn = document.getElementById('editor-save-btn');
    saveBtn?.addEventListener('click', () => this.handleSave());

    // Cancel button
    const cancelBtn = document.getElementById('editor-cancel-btn');
    cancelBtn?.addEventListener('click', () => this.close());

    // YAML Textarea live validation & input
    const yamlTextarea = document.getElementById('yaml-textarea') as HTMLTextAreaElement | null;
    yamlTextarea?.addEventListener('input', () => {
      this.rawYaml = yamlTextarea.value;
      this.validateYamlDebounced();
    });
  }

  public async open(): Promise<void> {
    if (!this.dialog) return;

    try {
      const res = await fetch('/api/v1/config');
      const data = await res.json();
      if (data.config) {
        this.currentConfig = JSON.parse(JSON.stringify(data.config));
      }
      this.rawYaml = data.rawYaml || (data.config ? stringifyYaml(data.config) : '');

      // Load custom CSS & snapshots
      await Promise.all([this.loadCustomCss(), this.loadSnapshots()]);

      this.renderVisualForm();
      this.renderSettingsView();
      this.renderYamlEditor();
      this.renderGuidesView();
      this.dialog.showModal();
    } catch (err) {
      console.error('[DashPark Editor] Failed to open config:', err);
      this.showToast('Failed to load configuration file', 'error');
    }
  }

  public close(): void {
    if (this.dialog?.open) {
      this.dialog.close();
    }
  }

  private async loadCustomCss(): Promise<void> {
    try {
      const res = await fetch('/api/v1/custom/css');
      if (res.ok) {
        this.customCssContent = await res.text();
      }
    } catch {
      this.customCssContent = '';
    }
  }

  private async loadSnapshots(): Promise<void> {
    try {
      const res = await fetch('/api/v1/config/snapshots');
      if (res.ok) {
        const data = await res.json();
        this.snapshotsList = data.snapshots || [];
      }
    } catch {
      this.snapshotsList = [];
    }
  }

  private switchTab(tab: 'visual' | 'settings' | 'yaml' | 'guides'): void {
    this.activeTab = tab;

    document.querySelectorAll('.editor-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    const visualPane = document.getElementById('editor-visual-pane');
    const settingsPane = document.getElementById('editor-settings-pane');
    const yamlPane = document.getElementById('editor-yaml-pane');
    const guidesPane = document.getElementById('editor-guides-pane');

    visualPane?.classList.toggle('active', tab === 'visual');
    settingsPane?.classList.toggle('active', tab === 'settings');
    yamlPane?.classList.toggle('active', tab === 'yaml');
    guidesPane?.classList.toggle('active', tab === 'guides');

    if (tab === 'visual') {
      try {
        if (this.rawYaml && this.rawYaml.trim()) {
          const parsed = parseYaml(this.rawYaml);
          if (parsed && typeof parsed === 'object') {
            this.currentConfig = parsed;
          }
        }
      } catch {
        // Keep currentConfig if YAML has syntax error
      }
      this.renderVisualForm();
    } else if (tab === 'settings') {
      this.renderSettingsView();
    } else if (tab === 'yaml') {
      if (this.currentConfig) {
        const configToSerialize = JSON.parse(JSON.stringify(this.currentConfig));
        if (configToSerialize.pages && configToSerialize.pages.length > 0) {
          delete configToSerialize.categories;
        }
        this.rawYaml = stringifyYaml(configToSerialize);
      }
      this.renderYamlEditor();
    } else if (tab === 'guides') {
      this.renderGuidesView();
    }
  }

  private renderVisualForm(): void {
    const container = document.getElementById('visual-categories-list');
    if (!container || !this.currentConfig) return;

    const pages = this.currentConfig.pages || [];
    const isMultiPage = pages.length > 0;

    let activePage = isMultiPage ? pages.find((p) => p.id === this.activeEditingPageId) || pages[0] : null;
    let activeCategories: Category[] = [];

    if (activePage) {
      this.activeEditingPageId = activePage.id;
      activeCategories = activePage.categories;
    } else {
      activeCategories = this.currentConfig.categories || [];
    }

    const activePageIndex = pages.findIndex((p) => p.id === this.activeEditingPageId);

    const pagesHeaderHtml = isMultiPage
      ? `<div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem; background: var(--bg-surface); padding: 0.875rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <span style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">📄 Pages:</span>
              ${pages
                .map(
                  (p) => `
                    <button 
                      type="button" 
                      class="page-tab-btn ${p.id === this.activeEditingPageId ? 'active' : ''}" 
                      data-edit-page-id="${p.id}"
                      style="padding: 0.25rem 0.65rem; font-size: 0.75rem;"
                    >
                      ${this.escapeHtml(p.name)}
                    </button>
                  `
                )
                .join('')}
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <button type="button" class="btn-secondary" id="btn-move-page-left" ${activePageIndex <= 0 ? 'disabled' : ''} style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" title="Move Page Left">◀</button>
              <button type="button" class="btn-secondary" id="btn-move-page-right" ${activePageIndex >= pages.length - 1 ? 'disabled' : ''} style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" title="Move Page Right">▶</button>
              <button type="button" class="btn-secondary" id="btn-add-page" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">+ Add Page</button>
              <button type="button" class="btn-secondary" id="btn-delete-page" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: var(--status-offline);" title="Delete current page">Delete</button>
            </div>
          </div>

          ${
            activePage
              ? `<div style="display: flex; align-items: center; gap: 0.6rem; border-top: 1px solid var(--border-subtle); padding-top: 0.6rem; flex-wrap: wrap;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Edit Page:</span>
                  <input 
                    type="text" 
                    id="page-name-input" 
                    class="form-input" 
                    value="${this.escapeHtml(activePage.name)}" 
                    placeholder="Page Name" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.5rem; width: 140px; font-weight: 700;" 
                  />
                  <input 
                    type="text" 
                    id="page-icon-input" 
                    class="form-input" 
                    value="${this.escapeHtml(activePage.icon || 'home')}" 
                    placeholder="Icon (home, film, server)" 
                    style="font-size: 0.75rem; padding: 0.25rem 0.5rem; width: 120px; font-family: var(--font-mono);" 
                  />
                  <input 
                    type="text" 
                    id="page-desc-input" 
                    class="form-input" 
                    value="${this.escapeHtml(activePage.description || '')}" 
                    placeholder="Page subtitle or description..." 
                    style="font-size: 0.75rem; padding: 0.25rem 0.5rem; flex: 1; min-width: 180px;" 
                  />
                </div>`
              : ''
          }
        </div>`
      : `<div style="display: flex; justify-content: flex-end; margin-bottom: 0.75rem;">
          <button type="button" class="btn-secondary" id="btn-convert-multipage" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">+ Enable Multi-Page Tabs</button>
        </div>`;

    container.innerHTML = `
      ${pagesHeaderHtml}
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="font-size: 1rem; font-weight: 700;">Categories & Services</h3>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button type="button" class="btn-secondary" id="btn-export-yaml" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;" title="Download dashpark.yaml">⬇️ Export YAML</button>
          <button type="button" class="btn-secondary" id="btn-revert-config" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;" title="Revert to last saved configuration">↩️ Revert</button>
          <button type="button" class="btn-secondary" id="btn-add-category">+ Add Category</button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${activeCategories
          .map((cat, catIdx) => this.renderCategoryItem(cat, catIdx, activeCategories.length))
          .join('')}
      </div>
    `;

    // Hook page management
    container.querySelectorAll<HTMLButtonElement>('[data-edit-page-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-edit-page-id');
        if (pid) {
          this.activeEditingPageId = pid;
          this.renderVisualForm();
        }
      });
    });

    const pageNameInput = document.getElementById('page-name-input') as HTMLInputElement | null;
    const pageIconInput = document.getElementById('page-icon-input') as HTMLInputElement | null;
    const pageDescInput = document.getElementById('page-desc-input') as HTMLInputElement | null;

    if (activePage) {
      pageNameInput?.addEventListener('input', () => {
        if (activePage) activePage.name = pageNameInput.value;
      });
      pageIconInput?.addEventListener('input', () => {
        if (activePage) activePage.icon = pageIconInput.value;
      });
      pageDescInput?.addEventListener('input', () => {
        if (activePage) activePage.description = pageDescInput.value;
      });
    }

    document.getElementById('btn-move-page-left')?.addEventListener('click', () => {
      if (this.currentConfig?.pages && activePageIndex > 0) {
        const item = this.currentConfig.pages.splice(activePageIndex, 1)[0];
        this.currentConfig.pages.splice(activePageIndex - 1, 0, item);
        this.renderVisualForm();
      }
    });

    document.getElementById('btn-move-page-right')?.addEventListener('click', () => {
      if (this.currentConfig?.pages && activePageIndex < this.currentConfig.pages.length - 1) {
        const item = this.currentConfig.pages.splice(activePageIndex, 1)[0];
        this.currentConfig.pages.splice(activePageIndex + 1, 0, item);
        this.renderVisualForm();
      }
    });

    document.getElementById('btn-add-page')?.addEventListener('click', () => {
      const name = prompt('Enter new page name (e.g. Media, Servers, Network):');
      if (name && name.trim()) {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!this.currentConfig?.pages) this.currentConfig!.pages = [];
        this.currentConfig!.pages.push({
          id: id || `page_${Date.now()}`,
          name: name.trim(),
          icon: 'folder',
          description: `${name.trim()} Dashboard`,
          categories: [],
        });
        this.activeEditingPageId = id;
        this.renderVisualForm();
      }
    });

    document.getElementById('btn-convert-multipage')?.addEventListener('click', () => {
      if (this.currentConfig) {
        this.currentConfig.pages = [
          {
            id: 'home',
            name: 'Home',
            icon: 'home',
            description: 'Overview',
            categories: this.currentConfig.categories || [],
          },
          {
            id: 'media',
            name: 'Media',
            icon: 'film',
            description: 'Media & Streaming',
            categories: [],
          },
        ];
        this.activeEditingPageId = 'home';
        this.renderVisualForm();
      }
    });

    document.getElementById('btn-delete-page')?.addEventListener('click', () => {
      if (this.currentConfig?.pages && this.currentConfig.pages.length > 1) {
        if (confirm(`Delete current page "${this.activeEditingPageId}"?`)) {
          this.currentConfig.pages = this.currentConfig.pages.filter(
            (p) => p.id !== this.activeEditingPageId
          );
          this.activeEditingPageId = this.currentConfig.pages[0].id;
          this.renderVisualForm();
        }
      } else {
        alert('You must have at least one page.');
      }
    });

    document.getElementById('btn-export-yaml')?.addEventListener('click', () => {
      if (!this.currentConfig) return;
      const configToSerialize = JSON.parse(JSON.stringify(this.currentConfig));
      if (configToSerialize.pages && configToSerialize.pages.length > 0) {
        delete configToSerialize.categories;
      }
      const yamlStr = stringifyYaml(configToSerialize);
      const blob = new Blob([yamlStr], { type: 'text/yaml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dashpark.yaml';
      a.click();
    });

    document.getElementById('btn-revert-config')?.addEventListener('click', async () => {
      if (confirm('Revert all unsaved changes to the last saved configuration?')) {
        await this.open();
        this.showToast('Reverted to saved configuration', 'success');
      }
    });

    document.getElementById('btn-add-category')?.addEventListener('click', () => {
      const name = prompt('Enter new category name (e.g. Monitoring, Media, Security):');
      if (name && name.trim()) {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetCategories = this.getActiveCategoriesList();
        targetCategories.push({
          id,
          name: name.trim(),
          icon: 'folder',
          columns: 4,
          services: [],
        });
        this.renderVisualForm();
      }
    });

    this.attachVisualEventListeners();
  }

  private getActiveCategoriesList(): Category[] {
    if (!this.currentConfig) return [];
    if (this.currentConfig.pages && this.currentConfig.pages.length > 0) {
      const page = this.currentConfig.pages.find((p) => p.id === this.activeEditingPageId) || this.currentConfig.pages[0];
      return page.categories;
    }
    if (!this.currentConfig.categories) this.currentConfig.categories = [];
    return this.currentConfig.categories;
  }

  private renderCategoryItem(cat: Category, catIdx: number, totalCats: number): string {
    return `
      <div class="visual-category-card" data-cat-index="${catIdx}">
        <div class="visual-category-header">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; flex-wrap: wrap;">
            <input 
              type="text" 
              class="form-input cat-name-input" 
              value="${this.escapeHtml(cat.name)}" 
              data-cat-index="${catIdx}" 
              placeholder="Category Name" 
              style="font-weight: 700; max-width: 250px;"
            />
            <input 
              type="text" 
              class="form-input cat-icon-input" 
              value="${this.escapeHtml(cat.icon || 'folder')}" 
              data-cat-index="${catIdx}" 
              placeholder="Icon (e.g. server, film)" 
              style="max-width: 140px; font-family: var(--font-mono); font-size: 0.8125rem;"
            />
          </div>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <button type="button" class="btn-secondary btn-move-cat-up" data-cat-index="${catIdx}" ${catIdx === 0 ? 'disabled' : ''} title="Move Category Up" style="padding: 0.25rem 0.5rem;">▲</button>
            <button type="button" class="btn-secondary btn-move-cat-down" data-cat-index="${catIdx}" ${catIdx === totalCats - 1 ? 'disabled' : ''} title="Move Category Down" style="padding: 0.25rem 0.5rem;">▼</button>
            <button type="button" class="btn-secondary btn-add-service" data-cat-index="${catIdx}">+ Add Service</button>
            <button type="button" class="btn-secondary btn-delete-cat" data-cat-index="${catIdx}" style="color: var(--status-offline);" title="Delete Category">✕</button>
          </div>
        </div>

        <div class="visual-services-list">
          ${
            cat.services.length === 0
              ? `<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">No services in this category. Click "+ Add Service" to add one.</div>`
              : cat.services
                  .map((svc, svcIdx) => this.renderServiceItem(svc, catIdx, svcIdx, cat.services.length))
                  .join('')
          }
        </div>
      </div>
    `;
  }

  private renderServiceItem(svc: ServiceItem, catIdx: number, svcIdx: number, totalServices: number): string {
    const isWidgetEnabled = svc.widget?.enabled !== false;
    const isGraphEnabled = svc.widget?.showGraph !== false;
    const shortcuts = svc.shortcuts || [];
    const bentoSpan = svc.bentoSpan || '1x1';

    return `
      <div class="visual-service-item" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" style="display: flex; flex-direction: column; gap: 0.65rem; align-items: stretch; background: var(--bg-surface-elevated); padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        
        <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 280px;">
            <input 
              type="text" 
              class="form-input svc-name-input" 
              value="${this.escapeHtml(svc.name)}" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              placeholder="Service Name" 
              style="width: 140px; font-weight: 600;"
            />
            <input 
              type="text" 
              class="form-input svc-url-input" 
              value="${this.escapeHtml(svc.url)}" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              placeholder="http://192.168.1.50:8080" 
              style="flex: 1; font-family: var(--font-mono); font-size: 0.8125rem;"
            />
            <input 
              type="text" 
              class="form-input svc-icon-input" 
              value="${this.escapeHtml(svc.icon || '')}" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              placeholder="Icon (e.g. emby)" 
              style="width: 100px; font-family: var(--font-mono); font-size: 0.8125rem;"
            />
            <select class="form-input svc-bento-span" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" style="width: 105px; font-size: 0.75rem; padding: 0.25rem 0.4rem;" title="Bento Tile Grid Span">
              <option value="1x1" ${bentoSpan === '1x1' ? 'selected' : ''}>1x1 Tile</option>
              <option value="2x1" ${bentoSpan === '2x1' ? 'selected' : ''}>2x1 Wide</option>
              <option value="1x2" ${bentoSpan === '1x2' ? 'selected' : ''}>1x2 Tall</option>
              <option value="2x2" ${bentoSpan === '2x2' ? 'selected' : ''}>2x2 Large</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <button type="button" class="btn-secondary btn-move-svc-up" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" ${svcIdx === 0 ? 'disabled' : ''} title="Move Service Up" style="padding: 0.25rem 0.45rem;">▲</button>
            <button type="button" class="btn-secondary btn-move-svc-down" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" ${svcIdx === totalServices - 1 ? 'disabled' : ''} title="Move Service Down" style="padding: 0.25rem 0.45rem;">▼</button>
            
            <select class="form-input svc-preset-select" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: var(--bg-surface); color: var(--accent-primary); border-color: rgba(99, 102, 241, 0.4);">
              <option value="">⚡ 1-Click Preset...</option>
              ${HOMELAB_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <button 
              type="button" 
              class="ping-test-btn" 
              data-url="${this.escapeHtml(svc.pingUrl || svc.url)}"
              title="Test connection to endpoint"
            >
              ⚡ Test Ping
            </button>
            <button 
              type="button" 
              class="btn-secondary btn-delete-svc" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              style="padding: 0.25rem 0.6rem; color: var(--status-offline);" 
              title="Remove Service"
            >
              ✕
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.4rem; background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.75rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">📊 Live Widget:</span>
              <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer; color: var(--text-secondary);">
                <input type="checkbox" class="svc-widget-enabled" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" ${isWidgetEnabled ? 'checked' : ''} />
                Enabled
              </label>
              <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer; color: var(--text-secondary);">
                <input type="checkbox" class="svc-widget-showgraph" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" ${isGraphEnabled ? 'checked' : ''} />
                Show Graph in Tile
              </label>
            </div>
            <button 
              type="button" 
              class="btn-secondary btn-test-widget" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              style="font-size: 0.6875rem; padding: 0.2rem 0.5rem;"
              title="Test JSON API response"
            >
              🧪 Test Widget API
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input 
              type="text" 
              class="form-input svc-widget-url" 
              value="${this.escapeHtml(svc.widget?.url || '')}" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              placeholder="API URL (e.g. http://pihole.local/admin/api.php?summaryRaw)" 
              style="flex: 1; font-size: 0.75rem; padding: 0.25rem 0.5rem; font-family: var(--font-mono);"
            />
            <input 
              type="text" 
              class="form-input svc-widget-key" 
              value="${this.escapeHtml(svc.widget?.jsonPath || '')}" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              placeholder="JSON Path (e.g. ads_blocked_today)" 
              style="width: 140px; font-size: 0.75rem; padding: 0.25rem 0.5rem; font-family: var(--font-mono);"
            />
            <input 
              type="text" 
              class="form-input svc-widget-label" 
              value="${this.escapeHtml(svc.widget?.label || '')}" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              placeholder="Label (e.g. Blocked)" 
              style="width: 80px; font-size: 0.75rem; padding: 0.25rem 0.5rem;"
            />
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; background: var(--bg-surface); padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.75rem;">
          <span style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🔗 Shortcuts:</span>
          ${
            shortcuts.length === 0
              ? `<span style="color: var(--text-muted); font-size: 0.75rem;">None</span>`
              : shortcuts
                  .map(
                    (sc, scIdx) => `
                      <div style="display: inline-flex; align-items: center; gap: 0.2rem; background: var(--bg-surface-elevated); padding: 0.15rem 0.4rem; border-radius: 4px; border: 1px solid var(--border-subtle);">
                        <input 
                          type="text" 
                          class="sc-name-input" 
                          value="${this.escapeHtml(sc.name)}" 
                          data-cat-index="${catIdx}" 
                          data-svc-index="${svcIdx}" 
                          data-sc-index="${scIdx}" 
                          placeholder="Name" 
                          style="width: 60px; font-size: 0.6875rem; background: transparent; border: none; color: var(--text-primary);"
                        />
                        <input 
                          type="text" 
                          class="sc-url-input" 
                          value="${this.escapeHtml(sc.url)}" 
                          data-cat-index="${catIdx}" 
                          data-svc-index="${svcIdx}" 
                          data-sc-index="${scIdx}" 
                          placeholder="URL" 
                          style="width: 130px; font-size: 0.6875rem; background: transparent; border: none; color: var(--text-secondary); font-family: var(--font-mono);"
                        />
                        <button type="button" class="btn-delete-sc" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" data-sc-index="${scIdx}" style="background: none; border: none; color: var(--status-offline); cursor: pointer; font-size: 0.6875rem;">✕</button>
                      </div>
                    `
                  )
                  .join('')
          }
          <button type="button" class="btn-secondary btn-add-sc" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" style="font-size: 0.6875rem; padding: 0.15rem 0.45rem;">+ Add Shortcut</button>
        </div>

      </div>
    `;
  }

  private renderSettingsView(): void {
    const container = document.getElementById('settings-content-list');
    if (!container || !this.currentConfig) return;

    const meta = this.currentConfig.meta;
    const weather = meta.weather || { enabled: false, units: 'celsius' };
    const auth = meta.auth || { kioskMode: false };
    const webhooks = meta.alerts?.webhooks || [];

    container.innerHTML = `
      <div class="settings-split-wrapper">
        <!-- Left Sidebar Navigation -->
        <nav class="settings-nav-sidebar" id="settings-nav-sidebar" aria-label="Settings Categories">
          <button type="button" class="settings-nav-btn active" data-target-panel="panel-identity">🏠 Identity</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-appearance">🎨 Theme & Accent</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-wallpaper">🖼️ Wallpaper Studio</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-weather">🌤️ Weather Telemetry</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-security">🔒 PIN & Kiosk</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-webhooks">🔔 Outage Webhooks</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-importer">📥 1-Click Importer</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-custom">🖌️ Custom CSS & Icons</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-snapshots">🗂️ Snapshot History</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-clock">⏰ Clock & Search</button>
          <button type="button" class="settings-nav-btn" data-target-panel="panel-reset" style="color: var(--status-offline);">🔄 Factory Reset</button>
        </nav>

        <!-- Right Panels Viewport -->
        <div class="settings-panels-viewport" id="settings-panels-viewport">
        
        <!-- 1. General Dashboard Identity -->
        <div class="settings-card settings-panel-section" id="panel-identity">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🏠</span>
            <div>
              <h4 class="settings-card-title">Dashboard Information</h4>
              <p class="settings-card-subtitle">General titles, default layout, and header branding</p>
            </div>
          </div>
          <div class="settings-grid-2">
            <div class="settings-field">
              <label class="settings-label">Dashboard Title</label>
              <input type="text" id="set-meta-title" class="form-input" value="${this.escapeHtml(meta.title || 'DashPark')}" />
              <span class="settings-desc">Primary header title and browser tab label</span>
            </div>
            <div class="settings-field">
              <label class="settings-label">Subtitle / Description</label>
              <input type="text" id="set-meta-subtitle" class="form-input" value="${this.escapeHtml(meta.subtitle || '')}" placeholder="Homelab & Server Park" />
              <span class="settings-desc">Subheading displayed under dashboard title</span>
            </div>
            <div class="settings-field">
              <label class="settings-label">Default Layout Mode</label>
              <select id="set-meta-layout" class="form-input">
                <option value="grid" ${meta.layout === 'grid' ? 'selected' : ''}>Categorized Grid (Standard)</option>
                <option value="bento" ${meta.layout === 'bento' ? 'selected' : ''}>Bento Grid (Dynamic Tiles)</option>
                <option value="compact" ${meta.layout === 'compact' ? 'selected' : ''}>Compact List (High Density)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 2. Appearance & Accent Color -->
        <div class="settings-card settings-panel-section" id="panel-appearance">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🎨</span>
            <div>
              <h4 class="settings-card-title">Theme & Accent Palette</h4>
              <p class="settings-card-subtitle">Choose your color palette, dark mode style, and brand accents</p>
            </div>
          </div>
          <div class="settings-grid-2">
            <div class="settings-field">
              <label class="settings-label">Theme Preset</label>
              <select id="set-meta-theme" class="form-input">
                <option value="dark" ${meta.theme === 'dark' ? 'selected' : ''}>🌙 Dark (Slate Baseline)</option>
                <option value="nord" ${meta.theme === 'nord' ? 'selected' : ''}>❄️ Nord (Arctic Blue)</option>
                <option value="dracula" ${meta.theme === 'dracula' ? 'selected' : ''}>🧛 Dracula (Vampire Violet)</option>
                <option value="catppuccin" ${meta.theme === 'catppuccin' ? 'selected' : ''}>🐱 Catppuccin (Mocha)</option>
                <option value="cyberpunk" ${meta.theme === 'cyberpunk' ? 'selected' : ''}>⚡ Cyberpunk (High Contrast Neon)</option>
                <option value="glass" ${meta.theme === 'glass' ? 'selected' : ''}>💎 Glass (Frosted Acrylic)</option>
                <option value="light" ${meta.theme === 'light' ? 'selected' : ''}>☀️ Light (Clean Daytime)</option>
              </select>
            </div>
            <div class="settings-field">
              <label class="settings-label">Accent Color (HEX)</label>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="text" id="set-meta-accent" class="form-input" value="${this.escapeHtml(meta.accentColor || '#6366f1')}" style="width: 110px; font-family: var(--font-mono);" />
                <div class="color-swatches-row">
                  <button type="button" class="color-swatch-btn" data-color="#6366f1" style="background: #6366f1;" title="Indigo"></button>
                  <button type="button" class="color-swatch-btn" data-color="#10b981" style="background: #10b981;" title="Emerald"></button>
                  <button type="button" class="color-swatch-btn" data-color="#8b5cf6" style="background: #8b5cf6;" title="Violet"></button>
                  <button type="button" class="color-swatch-btn" data-color="#06b6d4" style="background: #06b6d4;" title="Cyan"></button>
                  <button type="button" class="color-swatch-btn" data-color="#f59e0b" style="background: #f59e0b;" title="Amber"></button>
                  <button type="button" class="color-swatch-btn" data-color="#f43f5e" style="background: #f43f5e;" title="Rose"></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Wallpaper Studio & Glassmorphism -->
        <div class="settings-card settings-panel-section" id="panel-wallpaper">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🖼️</span>
            <div>
              <h4 class="settings-card-title">Wallpaper Studio & Live Glassmorphism</h4>
              <p class="settings-card-subtitle">Set custom background wallpaper image and fine-tune blur and transparency</p>
            </div>
          </div>
          <div class="settings-field">
            <label class="settings-label">Background Wallpaper URL</label>
            <input type="text" id="set-meta-bgurl" class="form-input" value="${this.escapeHtml(meta.backgroundUrl || '')}" placeholder="https://example.com/wallpaper.jpg or /local/image.png" />
            <div style="margin-top: 0.5rem;">
              <span class="settings-desc">1-Click Wallpaper Presets:</span>
              <div class="wallpaper-presets-row" style="margin-top: 0.4rem;">
                <button type="button" class="wallpaper-preset-card" data-bg="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80">🌌 Minimal Mesh</button>
                <button type="button" class="wallpaper-preset-card" data-bg="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80">🖥️ Server Rack</button>
                <button type="button" class="wallpaper-preset-card" data-bg="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80">⚡ Cyber Grid</button>
                <button type="button" class="wallpaper-preset-card" data-bg="https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80">🪐 Deep Space</button>
                <button type="button" class="wallpaper-preset-card" data-bg="" style="color: var(--status-offline);">✕ Clear Wallpaper</button>
              </div>
            </div>
          </div>
          <div class="settings-grid-2" style="margin-top: 0.5rem;">
            <div class="settings-field">
              <label class="settings-label">Glass Blur: <span id="blur-val-display">${meta.glassBlur ?? 12}px</span></label>
              <div class="slider-row">
                <input type="range" id="set-meta-blur" class="range-slider" min="0" max="40" value="${meta.glassBlur ?? 12}" />
              </div>
            </div>
            <div class="settings-field">
              <label class="settings-label">Card Opacity: <span id="opacity-val-display">${Math.round((meta.glassOpacity ?? 0.75) * 100)}%</span></label>
              <div class="slider-row">
                <input type="range" id="set-meta-opacity" class="range-slider" min="20" max="100" value="${Math.round((meta.glassOpacity ?? 0.75) * 100)}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Weather & Environmental Telemetry -->
        <div class="settings-card settings-panel-section" id="panel-weather">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🌤️</span>
            <div>
              <h4 class="settings-card-title">Weather Telemetry (Zero API Key)</h4>
              <p class="settings-card-subtitle">Display local temperature & conditions powered by Open-Meteo</p>
            </div>
          </div>
          <div class="settings-grid-2">
            <div class="settings-field">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600;">
                <input type="checkbox" id="set-meta-weather-enabled" ${weather.enabled ? 'checked' : ''} />
                Enable Weather in Header
              </label>
              <span class="settings-desc">Displays live temperature and condition icon</span>
            </div>
            <div class="settings-field">
              <label class="settings-label">Temperature Unit</label>
              <select id="set-meta-weather-units" class="form-input">
                <option value="celsius" ${weather.units === 'celsius' ? 'selected' : ''}>Celsius (°C)</option>
                <option value="fahrenheit" ${weather.units === 'fahrenheit' ? 'selected' : ''}>Fahrenheit (°F)</option>
              </select>
            </div>
            <div class="settings-field">
              <label class="settings-label">Location / City Name</label>
              <input type="text" id="set-meta-weather-city" class="form-input" value="${this.escapeHtml(weather.city || '')}" placeholder="e.g. New York, London, Sydney" />
            </div>
            <div class="settings-field">
              <label class="settings-label">Coordinates (Lat, Lon)</label>
              <div style="display: flex; gap: 0.5rem;">
                <input type="number" step="0.01" id="set-meta-weather-lat" class="form-input" value="${weather.latitude ?? ''}" placeholder="Latitude (51.50)" />
                <input type="number" step="0.01" id="set-meta-weather-lon" class="form-input" value="${weather.longitude ?? ''}" placeholder="Longitude (-0.12)" />
              </div>
            </div>
          </div>
        </div>

        <!-- 5. PIN Protection & Kiosk Mode -->
        <div class="settings-card settings-panel-section" id="panel-security">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🔒</span>
            <div>
              <h4 class="settings-card-title">PIN Protection & Kiosk Mode</h4>
              <p class="settings-card-subtitle">Lock configuration editing behind a secure master PIN</p>
            </div>
          </div>
          <div class="settings-grid-2">
            <div class="settings-field">
              <label class="settings-label">Master PIN (${auth.pinHash ? '✓ PIN Active' : 'No PIN'})</label>
              <div style="display: flex; gap: 0.5rem;">
                <input type="password" id="set-meta-pin-input" class="form-input" placeholder="${auth.pinHash ? 'Enter new PIN' : 'Set 4-8 digit PIN'}" maxlength="16" />
                <button type="button" id="btn-save-pin" class="btn-secondary" style="font-size: 0.75rem;">Set PIN</button>
                ${auth.pinHash ? `<button type="button" id="btn-clear-pin" class="btn-secondary" style="color: var(--status-offline); font-size: 0.75rem;">Remove</button>` : ''}
              </div>
            </div>
            <div class="settings-field">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600; margin-top: 1.5rem;">
                <input type="checkbox" id="set-meta-kiosk-mode" ${auth.kioskMode ? 'checked' : ''} />
                Enable Read-Only Kiosk Mode
              </label>
              <span class="settings-desc">Hides the Edit and Customize buttons for public displays</span>
            </div>
          </div>
        </div>

        <!-- 6. Outage Alert Webhooks -->
        <div class="settings-card settings-panel-section" id="panel-webhooks">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🔔</span>
            <div>
              <h4 class="settings-card-title">Outage Alert Webhooks</h4>
              <p class="settings-card-subtitle">Send instant alerts to Discord, Telegram, Ntfy, or Gotify on service down</p>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <select id="new-webhook-type" class="form-input" style="width: 130px;">
                <option value="discord">Discord</option>
                <option value="telegram">Telegram</option>
                <option value="ntfy">Ntfy</option>
                <option value="gotify">Gotify</option>
              </select>
              <input type="text" id="new-webhook-url" class="form-input" placeholder="https://discord.com/api/webhooks/..." style="flex: 1; min-width: 250px; font-family: var(--font-mono); font-size: 0.8125rem;" />
              <button type="button" id="btn-add-webhook" class="btn-secondary">+ Add Webhook</button>
            </div>

            <div id="webhooks-list" style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${
                webhooks.length === 0
                  ? `<span style="font-size: 0.8125rem; color: var(--text-muted);">No webhooks configured. Add one above to receive outage alerts.</span>`
                  : webhooks
                      .map(
                        (wh, whIdx) => `
                          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.8125rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden; text-overflow: ellipsis;">
                              <span style="font-weight: 700; text-transform: uppercase; color: var(--accent-primary); font-size: 0.75rem;">${wh.type}:</span>
                              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary);">${this.escapeHtml(wh.url)}</span>
                            </div>
                            <button type="button" class="btn-delete-webhook" data-wh-idx="${whIdx}" style="background: none; border: none; color: var(--status-offline); cursor: pointer;">✕</button>
                          </div>
                        `
                      )
                      .join('')
              }
            </div>
          </div>
        </div>

        <!-- 7. 1-Click Multi-Dashboard Migration Importer -->
        <div class="settings-card settings-panel-section" id="panel-importer">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">📥</span>
            <div>
              <h4 class="settings-card-title">1-Click Dashboard Migration Importer</h4>
              <p class="settings-card-subtitle">Import from Homepage (services.yaml), Homarr, Dashy (conf.yml), or Heimdall</p>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <input type="file" id="import-file-input" accept=".yaml,.yml,.json" style="display: none;" />
            <div id="import-drop-zone" style="border: 2px dashed var(--border-subtle); padding: 1.5rem; text-align: center; border-radius: var(--radius-md); cursor: pointer; background: var(--bg-surface);">
              <span style="font-size: 1.5rem;">📂</span>
              <p style="font-size: 0.875rem; font-weight: 600; margin-top: 0.35rem;">Click to browse or drop your export file here</p>
              <p style="font-size: 0.75rem; color: var(--text-muted);">Supports services.yaml, conf.yml, or configs/*.json</p>
            </div>
            <div id="import-status-box" style="display: none; padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.8125rem;"></div>
          </div>
        </div>

        <!-- 8. Custom CSS & Custom Icon Uploader -->
        <div class="settings-card settings-panel-section" id="panel-custom">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🎨</span>
            <div>
              <h4 class="settings-card-title">Custom CSS & Local Icon Uploader</h4>
              <p class="settings-card-subtitle">Inject custom CSS overrides and upload custom PNG / SVG icons</p>
            </div>
          </div>
          <div class="settings-field">
            <label class="settings-label">Upload Custom Icon (Saved to <code>config/icons/</code>)</label>
            <input type="file" id="icon-file-input" accept="image/png,image/svg+xml,image/jpeg,image/webp" style="display: none;" />
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" id="btn-browse-icon" class="btn-secondary" style="font-size: 0.75rem;">Upload Icon File</button>
              <span id="upload-icon-status" style="font-size: 0.75rem; color: var(--text-muted);">Select PNG/SVG to upload</span>
            </div>
          </div>
          <div class="settings-field" style="margin-top: 0.75rem;">
            <label class="settings-label">User Custom CSS Overrides (<code>config/custom.css</code>)</label>
            <textarea id="custom-css-textarea" class="form-input" style="height: 100px; font-family: var(--font-mono); font-size: 0.75rem;" placeholder="/* Add custom styling here */\n.service-card { border-radius: 20px; }">${this.escapeHtml(this.customCssContent)}</textarea>
            <div style="display: flex; justify-content: flex-end; margin-top: 0.4rem;">
              <button type="button" id="btn-save-css" class="btn-secondary" style="font-size: 0.75rem;">Save Custom CSS</button>
            </div>
          </div>
        </div>

        <!-- 9. Versioned Snapshots & Rollback History -->
        <div class="settings-card settings-panel-section" id="panel-snapshots">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🗂️</span>
            <div>
              <h4 class="settings-card-title">Versioned Snapshots & Rollback History</h4>
              <p class="settings-card-subtitle">Restore recent configuration revisions with 1 click</p>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${
              this.snapshotsList.length === 0
                ? `<span style="font-size: 0.8125rem; color: var(--text-muted);">No snapshots available yet. Snapshots are created automatically on each save.</span>`
                : this.snapshotsList
                    .map(
                      (s) => `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.8125rem;">
                          <div>
                            <span style="font-weight: 600;">${new Date(s.timestamp).toLocaleString()}</span>
                            <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 0.5rem;">(${s.servicesCount} services, ${(s.sizeBytes / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button type="button" class="btn-secondary btn-restore-snap" data-snap-file="${s.filename}" style="font-size: 0.75rem; padding: 0.2rem 0.6rem;">↩️ Restore</button>
                        </div>
                      `
                    )
                    .join('')
            }
          </div>
        </div>

        <!-- 10. Clock & Search Engine -->
        <div class="settings-card settings-panel-section" id="panel-clock">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">⏰</span>
            <div>
              <h4 class="settings-card-title">Clock & Search Bar</h4>
              <p class="settings-card-subtitle">Format the status clock, search target window, and multi-display monitor options</p>
            </div>
          </div>
          <div class="settings-grid-2">
            <div class="settings-field">
              <label class="settings-label">Clock Controls</label>
              <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
                  <input type="checkbox" id="set-meta-showclock" ${meta.showClock !== false ? 'checked' : ''} />
                  Show Clock in Header
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
                  <input type="checkbox" id="set-meta-showseconds" ${meta.showSeconds !== false ? 'checked' : ''} />
                  Display Seconds (:SS)
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
                  <input type="checkbox" id="set-meta-showdate" ${meta.showDate !== false ? 'checked' : ''} />
                  Display Date (Day, Month)
                </label>
              </div>
            </div>
            <div class="settings-field">
              <label class="settings-label">Search Provider</label>
              <select id="set-meta-searchprovider" class="form-input">
                <option value="duckduckgo" ${(meta.searchEngine?.provider || 'duckduckgo') === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
                <option value="google" ${(meta.searchEngine?.provider || 'duckduckgo') === 'google' ? 'selected' : ''}>Google</option>
                <option value="brave" ${(meta.searchEngine?.provider || 'duckduckgo') === 'brave' ? 'selected' : ''}>Brave Search</option>
                <option value="searxng" ${(meta.searchEngine?.provider || 'duckduckgo') === 'searxng' ? 'selected' : ''}>SearXNG (Self-Hosted)</option>
              </select>
            </div>
            <div class="settings-field">
              <label class="settings-label">Open Search Results In</label>
              <select id="set-meta-searchtarget" class="form-input">
                <option value="new_tab" ${(meta.searchEngine?.target || 'new_tab') === 'new_tab' ? 'selected' : ''}>New Tab (_blank)</option>
                <option value="same_tab" ${(meta.searchEngine?.target || 'new_tab') === 'same_tab' ? 'selected' : ''}>Current Page (_self)</option>
                <option value="new_window" ${(meta.searchEngine?.target || 'new_tab') === 'new_window' ? 'selected' : ''}>New Window (Centered Popup)</option>
                <option value="target_screen" ${(meta.searchEngine?.target || 'new_tab') === 'target_screen' ? 'selected' : ''}>Target External Monitor (Multi-Screen)</option>
              </select>
            </div>
            <div class="settings-field" id="field-search-screen" style="display: ${(meta.searchEngine?.target === 'target_screen') ? 'block' : 'none'};">
              <label class="settings-label">Target Monitor / Display</label>
              <select id="set-meta-searchscreen" class="form-input">
                <option value="0" ${(meta.searchEngine?.targetScreen || 0) === 0 ? 'selected' : ''}>Display 1 (Primary / Default)</option>
                <option value="1" ${(meta.searchEngine?.targetScreen || 0) === 1 ? 'selected' : ''}>Display 2 (Secondary Monitor)</option>
                <option value="2" ${(meta.searchEngine?.targetScreen || 0) === 2 ? 'selected' : ''}>Display 3 (Tertiary Monitor)</option>
              </select>
            </div>
            <div class="settings-field" id="field-search-winsize" style="display: ${(meta.searchEngine?.target === 'new_window' || meta.searchEngine?.target === 'target_screen') ? 'flex' : 'none'}; gap: 0.5rem;">
              <div style="flex: 1;">
                <label class="settings-label">Window Width (px)</label>
                <input type="number" id="set-meta-searchwidth" class="form-input" min="400" max="3840" value="${meta.searchEngine?.windowWidth || 1400}" />
              </div>
              <div style="flex: 1;">
                <label class="settings-label">Window Height (px)</label>
                <input type="number" id="set-meta-searchheight" class="form-input" min="300" max="2160" value="${meta.searchEngine?.windowHeight || 900}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 11. Reset & Danger Zone -->
        <div class="settings-card settings-panel-section" id="panel-reset" style="border-color: rgba(239, 68, 68, 0.3);">
          <div class="settings-card-header">
            <span style="font-size: 1.25rem;">🔄</span>
            <div>
              <h4 class="settings-card-title" style="color: var(--status-offline);">Reset & Restore Sample Dashboard</h4>
              <p class="settings-card-subtitle">Restore DashPark to the default dual-page homelab showcase</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <p style="font-size: 0.8125rem; color: var(--text-secondary); max-width: 500px;">
              Overwrites active configuration with the factory <code>dashpark.sample.yaml</code> example. A backup will be preserved at <code>config/dashpark.yaml.bak</code>.
            </p>
            <button type="button" class="btn-secondary" id="btn-reset-to-sample" style="color: var(--status-offline); border-color: rgba(239, 68, 68, 0.4); font-weight: 700;">
              Reset to Example Dashboard
            </button>
          </div>
        </div>

        </div> <!-- /settings-panels-viewport -->
      </div> <!-- /settings-split-wrapper -->
    `;

    this.attachSettingsEventListeners();
  }

  private attachSettingsEventListeners(): void {
    if (!this.currentConfig) return;
    const meta = this.currentConfig.meta;

    // Sidebar Category Navigation
    document.querySelectorAll<HTMLButtonElement>('.settings-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target-panel');
        if (!targetId) return;

        document.querySelectorAll('.settings-nav-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Title & Subtitle & Layout
    document.getElementById('set-meta-title')?.addEventListener('input', (e) => {
      meta.title = (e.target as HTMLInputElement).value;
    });
    document.getElementById('set-meta-subtitle')?.addEventListener('input', (e) => {
      meta.subtitle = (e.target as HTMLInputElement).value;
    });
    document.getElementById('set-meta-layout')?.addEventListener('change', (e) => {
      meta.layout = (e.target as HTMLSelectElement).value as LayoutMode;
    });

    // Theme & Accent
    document.getElementById('set-meta-theme')?.addEventListener('change', (e) => {
      meta.theme = (e.target as HTMLSelectElement).value as ThemeName;
    });
    const accentInput = document.getElementById('set-meta-accent') as HTMLInputElement | null;
    accentInput?.addEventListener('input', () => {
      meta.accentColor = accentInput.value;
    });

    document.querySelectorAll<HTMLButtonElement>('.color-swatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        if (color && accentInput) {
          meta.accentColor = color;
          accentInput.value = color;
        }
      });
    });

    // Background & Glassmorphism
    const bgUrlInput = document.getElementById('set-meta-bgurl') as HTMLInputElement | null;
    bgUrlInput?.addEventListener('input', () => {
      meta.backgroundUrl = bgUrlInput.value;
    });

    document.querySelectorAll<HTMLButtonElement>('.wallpaper-preset-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bg = btn.getAttribute('data-bg') || '';
        meta.backgroundUrl = bg;
        if (bgUrlInput) bgUrlInput.value = bg;
      });
    });

    const blurSlider = document.getElementById('set-meta-blur') as HTMLInputElement | null;
    const blurDisplay = document.getElementById('blur-val-display');
    blurSlider?.addEventListener('input', () => {
      const val = parseInt(blurSlider.value, 10);
      meta.glassBlur = val;
      if (blurDisplay) blurDisplay.textContent = `${val}px`;
    });

    const opacitySlider = document.getElementById('set-meta-opacity') as HTMLInputElement | null;
    const opacityDisplay = document.getElementById('opacity-val-display');
    opacitySlider?.addEventListener('input', () => {
      const val = parseInt(opacitySlider.value, 10);
      meta.glassOpacity = val / 100;
      if (opacityDisplay) opacityDisplay.textContent = `${val}%`;
    });

    // Weather settings
    document.getElementById('set-meta-weather-enabled')?.addEventListener('change', (e) => {
      if (!meta.weather) meta.weather = { enabled: false, units: 'celsius' };
      meta.weather.enabled = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('set-meta-weather-units')?.addEventListener('change', (e) => {
      if (!meta.weather) meta.weather = { enabled: true, units: 'celsius' };
      meta.weather.units = (e.target as HTMLSelectElement).value as any;
    });
    document.getElementById('set-meta-weather-city')?.addEventListener('input', (e) => {
      if (!meta.weather) meta.weather = { enabled: true, units: 'celsius' };
      meta.weather.city = (e.target as HTMLInputElement).value;
    });
    document.getElementById('set-meta-weather-lat')?.addEventListener('input', (e) => {
      if (!meta.weather) meta.weather = { enabled: true, units: 'celsius' };
      meta.weather.latitude = parseFloat((e.target as HTMLInputElement).value) || undefined;
    });
    document.getElementById('set-meta-weather-lon')?.addEventListener('input', (e) => {
      if (!meta.weather) meta.weather = { enabled: true, units: 'celsius' };
      meta.weather.longitude = parseFloat((e.target as HTMLInputElement).value) || undefined;
    });

    // PIN & Kiosk Mode
    document.getElementById('set-meta-kiosk-mode')?.addEventListener('change', (e) => {
      if (!meta.auth) meta.auth = { kioskMode: false };
      meta.auth.kioskMode = (e.target as HTMLInputElement).checked;
    });

    document.getElementById('btn-save-pin')?.addEventListener('click', async () => {
      const pinInput = document.getElementById('set-meta-pin-input') as HTMLInputElement | null;
      const pin = pinInput?.value.trim();
      if (!pin) {
        alert('Please enter a PIN');
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/hash-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (data.hash) {
          if (!meta.auth) meta.auth = { kioskMode: false };
          meta.auth.pinHash = data.hash;
          this.showToast('PIN configured successfully! Remember this PIN.', 'success');
          this.renderSettingsView();
        }
      } catch {
        this.showToast('Failed to compute PIN hash', 'error');
      }
    });

    document.getElementById('btn-clear-pin')?.addEventListener('click', () => {
      if (confirm('Remove master PIN protection?')) {
        if (meta.auth) delete meta.auth.pinHash;
        this.showToast('PIN removed', 'success');
        this.renderSettingsView();
      }
    });

    // Webhooks
    document.getElementById('btn-add-webhook')?.addEventListener('click', () => {
      const typeSelect = document.getElementById('new-webhook-type') as HTMLSelectElement | null;
      const urlInput = document.getElementById('new-webhook-url') as HTMLInputElement | null;

      const url = urlInput?.value.trim();
      const type = (typeSelect?.value || 'discord') as any;

      if (!url) {
        alert('Please enter a webhook URL');
        return;
      }

      if (!meta.alerts) meta.alerts = { webhooks: [] };
      if (!meta.alerts.webhooks) meta.alerts.webhooks = [];

      meta.alerts.webhooks.push({
        url,
        type,
        enabled: true,
        consecutiveFailures: 2,
      });

      this.showToast(`Added ${type} webhook`, 'success');
      this.renderSettingsView();
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-delete-webhook').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-wh-idx') || '0', 10);
        if (meta.alerts?.webhooks) {
          meta.alerts.webhooks.splice(idx, 1);
          this.renderSettingsView();
        }
      });
    });

    // 1-Click Dashboard Migration Importer
    const dropZone = document.getElementById('import-drop-zone');
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement | null;
    const statusBox = document.getElementById('import-status-box');

    dropZone?.addEventListener('click', () => fileInput?.click());
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--accent-primary)';
    });
    dropZone?.addEventListener('dragleave', () => {
      if (dropZone) dropZone.style.borderColor = 'var(--border-subtle)';
    });
    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dropZone) dropZone.style.borderColor = 'var(--border-subtle)';
      if (e.dataTransfer?.files?.[0]) {
        this.handleImportFile(e.dataTransfer.files[0], statusBox);
      }
    });
    fileInput?.addEventListener('change', () => {
      if (fileInput.files?.[0]) {
        this.handleImportFile(fileInput.files[0], statusBox);
      }
    });

    // Custom CSS & Icon Upload
    const btnBrowseIcon = document.getElementById('btn-browse-icon');
    const iconFileInput = document.getElementById('icon-file-input') as HTMLInputElement | null;
    const uploadIconStatus = document.getElementById('upload-icon-status');

    btnBrowseIcon?.addEventListener('click', () => iconFileInput?.click());
    iconFileInput?.addEventListener('change', async () => {
      const file = iconFileInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          if (uploadIconStatus) uploadIconStatus.textContent = 'Uploading...';
          const res = await fetch('/api/v1/custom/icons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, dataUrl }),
          });
          const data = await res.json();
          if (data.success) {
            if (uploadIconStatus) uploadIconStatus.textContent = `✓ Uploaded: ${data.filename}`;
            this.showToast(`Uploaded custom icon: ${data.filename}`, 'success');
          } else {
            if (uploadIconStatus) uploadIconStatus.textContent = `✕ ${data.error}`;
          }
        } catch {
          if (uploadIconStatus) uploadIconStatus.textContent = '✕ Upload failed';
        }
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-save-css')?.addEventListener('click', async () => {
      const cssArea = document.getElementById('custom-css-textarea') as HTMLTextAreaElement | null;
      const css = cssArea?.value || '';

      try {
        const res = await fetch('/api/v1/custom/css', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ css }),
        });
        if (res.ok) {
          this.showToast('Custom CSS saved & live-injected!', 'success');
          // Reload link tag
          const link = document.getElementById('custom-css-link') as HTMLLinkElement | null;
          if (link) link.href = `/api/v1/custom/css?t=${Date.now()}`;
        }
      } catch {
        this.showToast('Failed to save custom CSS', 'error');
      }
    });

    // Snapshot Restore
    document.querySelectorAll<HTMLButtonElement>('.btn-restore-snap').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const filename = btn.getAttribute('data-snap-file');
        if (!filename) return;

        if (confirm(`Restore configuration to snapshot ${filename}?`)) {
          try {
            const res = await fetch('/api/v1/config/snapshots/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename }),
            });
            const data = await res.json();
            if (data.success) {
              this.showToast('Snapshot restored successfully!', 'success');
              await this.open();
              this.onSavedCallback();
            } else {
              this.showToast(data.error || 'Restore failed', 'error');
            }
          } catch {
            this.showToast('Network error while restoring snapshot', 'error');
          }
        }
      });
    });

    // Clock & Search
    document.getElementById('set-meta-showclock')?.addEventListener('change', (e) => {
      meta.showClock = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('set-meta-showseconds')?.addEventListener('change', (e) => {
      meta.showSeconds = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('set-meta-showdate')?.addEventListener('change', (e) => {
      meta.showDate = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('set-meta-searchprovider')?.addEventListener('change', (e) => {
      if (!meta.searchEngine) meta.searchEngine = { enabled: true };
      meta.searchEngine.provider = (e.target as HTMLSelectElement).value as any;
    });
    document.getElementById('set-meta-searchtarget')?.addEventListener('change', (e) => {
      if (!meta.searchEngine) meta.searchEngine = { enabled: true };
      const val = (e.target as HTMLSelectElement).value as any;
      meta.searchEngine.target = val;
      try {
        localStorage.setItem('dashpark_search_target', val);
      } catch {
        // Ignore
      }
      const screenField = document.getElementById('field-search-screen');
      const winSizeField = document.getElementById('field-search-winsize');
      if (screenField) screenField.style.display = val === 'target_screen' ? 'block' : 'none';
      if (winSizeField) winSizeField.style.display = (val === 'new_window' || val === 'target_screen') ? 'flex' : 'none';
    });
    document.getElementById('set-meta-searchscreen')?.addEventListener('change', (e) => {
      if (!meta.searchEngine) meta.searchEngine = { enabled: true };
      const idx = parseInt((e.target as HTMLSelectElement).value, 10) || 0;
      meta.searchEngine.targetScreen = idx;
      try {
        localStorage.setItem('dashpark_search_screen_index', String(idx));
      } catch {
        // Ignore
      }
    });
    document.getElementById('set-meta-searchwidth')?.addEventListener('input', (e) => {
      if (!meta.searchEngine) meta.searchEngine = { enabled: true };
      const w = parseInt((e.target as HTMLInputElement).value, 10) || 1400;
      meta.searchEngine.windowWidth = w;
      try {
        localStorage.setItem('dashpark_search_win_width', String(w));
      } catch {
        // Ignore
      }
    });
    document.getElementById('set-meta-searchheight')?.addEventListener('input', (e) => {
      if (!meta.searchEngine) meta.searchEngine = { enabled: true };
      const h = parseInt((e.target as HTMLInputElement).value, 10) || 900;
      meta.searchEngine.windowHeight = h;
      try {
        localStorage.setItem('dashpark_search_win_height', String(h));
      } catch {
        // Ignore
      }
    });

    // Reset to Sample
    document.getElementById('btn-reset-to-sample')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset your dashboard back to the factory example? Your current layout will be saved to dashpark.yaml.bak.')) {
        try {
          const res = await fetch('/api/v1/config/reset', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            this.showToast('Dashboard reset to example configuration!', 'success');
            this.close();
            this.onSavedCallback();
          } else {
            this.showToast(data.message || 'Reset failed', 'error');
          }
        } catch {
          this.showToast('Network error while resetting configuration', 'error');
        }
      }
    });
  }

  private handleImportFile(file: File, statusBox: HTMLElement | null): void {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const result = detectAndImportConfig(content);

      if (statusBox) {
        statusBox.style.display = 'block';
        if (result.success) {
          statusBox.style.background = 'rgba(16, 185, 129, 0.15)';
          statusBox.style.color = 'var(--status-online)';
          statusBox.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span>✓ Detected <strong>${result.detectedFormat.toUpperCase()}</strong> format (${result.totalServices} services across ${result.categories.length} categories).</span>
              <button type="button" id="btn-apply-import" class="btn-primary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">Apply Import</button>
            </div>
          `;

          document.getElementById('btn-apply-import')?.addEventListener('click', () => {
            if (this.currentConfig) {
              if (result.pages.length > 0) {
                this.currentConfig.pages = result.pages;
              } else {
                this.currentConfig.categories = result.categories;
              }
              this.showToast(`Imported ${result.totalServices} services from ${result.detectedFormat}!`, 'success');
              this.renderVisualForm();
              this.switchTab('visual');
            }
          });
        } else {
          statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
          statusBox.style.color = 'var(--status-offline)';
          statusBox.textContent = `✕ Import Error: ${result.error || 'Unrecognized format'}`;
        }
      }
    };
    reader.readAsText(file);
  }

  private renderGuidesView(): void {
    const container = document.getElementById('guides-content-list');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary);">📖 Homelab Service Connection Guides</h3>
        <p style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem;">
          Quick cheatsheet for connecting popular self-hosted services, locating API keys, and setting up real-time telemetry widgets.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${HOMELAB_PRESETS.map(
          (preset) => `
            <div class="guide-preset-card">
              <div class="guide-header-row">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <span style="font-size: 1.25rem;">⚡</span>
                  <h4 class="guide-title">${this.escapeHtml(preset.guide.title)}</h4>
                </div>
                <span class="guide-auth-badge">${preset.guide.authType === 'none' ? 'Zero Auth' : preset.guide.authType}</span>
              </div>
              <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4;">
                ${this.escapeHtml(preset.guide.tokenInstructions)}
              </p>
              <div class="guide-code-box">
                <div><strong>Default Endpoint:</strong> <code>${this.escapeHtml(preset.widget?.url || preset.urlPlaceholder)}</code></div>
                <div style="margin-top: 0.25rem;"><strong>JSONPath Extractor:</strong> <code>${this.escapeHtml(preset.guide.sampleJsonPath)}</code></div>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-muted);">
                💡 <strong>Tip:</strong> ${this.escapeHtml(preset.guide.endpointTips)}
              </p>
            </div>
          `
        ).join('')}
      </div>
    `;
  }

  private attachVisualEventListeners(): void {
    const activeCategories = this.getActiveCategoriesList();

    document.querySelectorAll<HTMLButtonElement>('.btn-move-cat-up').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        if (catIdx > 0 && activeCategories[catIdx]) {
          const item = activeCategories.splice(catIdx, 1)[0];
          activeCategories.splice(catIdx - 1, 0, item);
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-move-cat-down').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        if (catIdx < activeCategories.length - 1 && activeCategories[catIdx]) {
          const item = activeCategories.splice(catIdx, 1)[0];
          activeCategories.splice(catIdx + 1, 0, item);
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-move-svc-up').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        const services = activeCategories[catIdx]?.services;
        if (services && svcIdx > 0) {
          const item = services.splice(svcIdx, 1)[0];
          services.splice(svcIdx - 1, 0, item);
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-move-svc-down').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        const services = activeCategories[catIdx]?.services;
        if (services && svcIdx < services.length - 1) {
          const item = services.splice(svcIdx, 1)[0];
          services.splice(svcIdx + 1, 0, item);
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLSelectElement>('.svc-preset-select').forEach((select) => {
      select.addEventListener('change', () => {
        const presetId = select.value;
        if (!presetId) return;

        const preset = HOMELAB_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;

        const catIdx = parseInt(select.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(select.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];

        if (svc) {
          svc.name = preset.name;
          svc.url = preset.urlPlaceholder;
          svc.icon = preset.icon;
          svc.description = preset.description;
          svc.pingUrl = preset.defaultPingUrl;
          svc.tags = [...preset.tags];
          if (preset.widget) {
            svc.widget = JSON.parse(JSON.stringify(preset.widget));
          }
          if (preset.shortcuts) {
            svc.shortcuts = JSON.parse(JSON.stringify(preset.shortcuts));
          }
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLSelectElement>('.svc-bento-span').forEach((select) => {
      select.addEventListener('change', () => {
        const catIdx = parseInt(select.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(select.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          svc.bentoSpan = select.value as any;
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.cat-name-input').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        if (activeCategories[catIdx]) {
          activeCategories[catIdx].name = input.value;
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLInputElement>('.cat-icon-input').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        if (activeCategories[catIdx]) {
          activeCategories[catIdx].icon = input.value;
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-delete-cat').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        if (confirm(`Delete category "${activeCategories[catIdx]?.name}"?`)) {
          activeCategories.splice(catIdx, 1);
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-add-service').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const name = prompt('Service Name (e.g. Emby, Pi-hole, Proxmox):');
        if (name && name.trim()) {
          const url = prompt('Service URL (e.g. http://192.168.1.100:8080):', 'http://');
          if (url && url.trim()) {
            const cleanId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            activeCategories[catIdx].services.push({
              id: cleanId || `svc_${Date.now()}`,
              name: name.trim(),
              url: url.trim(),
              icon: cleanId,
              target: '_blank',
              tags: [],
              bentoSpan: '1x1',
              widget: { enabled: true, type: 'stat', showGraph: true },
              shortcuts: [],
            });
            this.renderVisualForm();
          }
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-url-input').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          svc.url = input.value;

          const detected = detectServiceFromUrl(input.value);
          if (detected && (!svc.name || svc.name.startsWith('svc_') || svc.name.startsWith('New Service') || svc.name === 'Link')) {
            svc.name = detected.name;
            svc.icon = detected.icon;
            svc.description = detected.description;
            svc.pingUrl = detected.defaultPingUrl;
            svc.tags = [...detected.tags];
            if (detected.widget) {
              svc.widget = JSON.parse(JSON.stringify(detected.widget));
            }
            if (detected.shortcuts) {
              svc.shortcuts = JSON.parse(JSON.stringify(detected.shortcuts));
            }
            this.showToast(`⚡ Auto-detected ${detected.name}! Configured telemetry & shortcuts.`, 'success');
            this.renderVisualForm();
          }
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLInputElement>('.svc-name-input').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        if (activeCategories[catIdx]?.services[svcIdx]) {
          activeCategories[catIdx].services[svcIdx].name = input.value;
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLInputElement>('.svc-icon-input').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        if (activeCategories[catIdx]?.services[svcIdx]) {
          activeCategories[catIdx].services[svcIdx].icon = input.value;
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-delete-svc').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        if (activeCategories[catIdx]?.services) {
          activeCategories[catIdx].services.splice(svcIdx, 1);
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-widget-enabled').forEach((chk) => {
      chk.addEventListener('change', () => {
        const catIdx = parseInt(chk.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(chk.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.enabled = chk.checked;
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-widget-showgraph').forEach((chk) => {
      chk.addEventListener('change', () => {
        const catIdx = parseInt(chk.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(chk.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.showGraph = chk.checked;
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-widget-url').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.url = input.value;
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLInputElement>('.svc-widget-key').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.jsonPath = input.value;
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLInputElement>('.svc-widget-label').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.label = input.value;
        }
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-add-sc').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.shortcuts) svc.shortcuts = [];
          svc.shortcuts.push({ name: 'Link', url: svc.url });
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.sc-name-input').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const scIdx = parseInt(input.getAttribute('data-sc-index') || '0', 10);
        const sc = activeCategories[catIdx]?.services[svcIdx]?.shortcuts?.[scIdx];
        if (sc) sc.name = input.value;
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLInputElement>('.sc-url-input').forEach((input) => {
      const update = () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const scIdx = parseInt(input.getAttribute('data-sc-index') || '0', 10);
        const sc = activeCategories[catIdx]?.services[svcIdx]?.shortcuts?.[scIdx];
        if (sc) sc.url = input.value;
      };
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-delete-sc').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        const scIdx = parseInt(btn.getAttribute('data-sc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        if (svc?.shortcuts) {
          svc.shortcuts.splice(scIdx, 1);
          this.renderVisualForm();
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-test-widget').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        const svc = activeCategories[catIdx]?.services[svcIdx];
        const url = svc?.widget?.url;
        const jsonPath = svc?.widget?.jsonPath;

        if (!url) {
          alert('Please enter an API URL first');
          return;
        }

        btn.textContent = '⏳ Testing...';

        try {
          const res = await fetch('/api/v1/widgets/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, jsonPath, headers: svc?.widget?.headers }),
          });
          const data = await res.json();

          if (data.success) {
            btn.textContent = `✓ Value: ${JSON.stringify(data.extractedValue ?? 'OK')}`;
            btn.style.color = 'var(--status-online)';
          } else {
            btn.textContent = `✕ ${data.error || 'Failed'}`;
            btn.style.color = 'var(--status-offline)';
          }
        } catch {
          btn.textContent = '✕ Error';
          btn.style.color = 'var(--status-offline)';
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.ping-test-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const url = btn.getAttribute('data-url');
        if (!url) return;

        btn.className = 'ping-test-btn testing';
        btn.textContent = '⏳ Testing...';

        try {
          const res = await fetch('/api/v1/health/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });

          const data = await res.json();
          if (data.status === 'online') {
            btn.className = 'ping-test-btn online';
            btn.textContent = `✓ ${data.latencyMs}ms (${data.statusCode || 200})`;
          } else {
            btn.className = 'ping-test-btn offline';
            btn.textContent = `✕ Offline (${data.error || 'Timeout'})`;
          }
        } catch {
          btn.className = 'ping-test-btn offline';
          btn.textContent = '✕ Unreachable';
        }
      });
    });
  }

  private renderYamlEditor(): void {
    const yamlTextarea = document.getElementById('yaml-textarea') as HTMLTextAreaElement | null;
    if (yamlTextarea) {
      yamlTextarea.value = this.rawYaml;
    }
    this.validateYamlDebounced();
  }

  private validateYamlDebounced(): void {
    if (this.validationDebounceTimer) clearTimeout(this.validationDebounceTimer);
    this.validationDebounceTimer = setTimeout(() => this.runYamlValidation(), 300);
  }

  private async runYamlValidation(): Promise<void> {
    const statusBadge = document.getElementById('yaml-status-badge');
    const statusMsg = document.getElementById('yaml-status-message');
    if (!statusBadge) return;

    try {
      const res = await fetch('/api/v1/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: this.rawYaml }),
      });

      const data = await res.json();

      if (data.valid) {
        statusBadge.className = 'yaml-status-badge valid';
        statusBadge.innerHTML = '✓ Valid YAML Schema';
        if (statusMsg) statusMsg.textContent = 'Ready to save';
      } else {
        const first = data.diagnostics?.[0];
        statusBadge.className = 'yaml-status-badge invalid';
        statusBadge.innerHTML = `✕ Line ${first?.line || 1}, Col ${first?.column || 1}`;
        if (statusMsg) statusMsg.textContent = first?.message || 'Syntax Error';
      }
    } catch {
      statusBadge.className = 'yaml-status-badge invalid';
      statusBadge.textContent = 'Server validation unreachable';
    }
  }

  private async handleSave(): Promise<void> {
    const saveBtn = document.getElementById('editor-save-btn') as HTMLButtonElement | null;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    let payloadContent = this.rawYaml;
    if ((this.activeTab === 'visual' || this.activeTab === 'settings') && this.currentConfig) {
      const configToSerialize = JSON.parse(JSON.stringify(this.currentConfig));
      if (configToSerialize.pages && configToSerialize.pages.length > 0) {
        delete configToSerialize.categories;
      }
      payloadContent = stringifyYaml(configToSerialize);
    }

    try {
      const res = await fetch('/api/v1/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payloadContent }),
      });

      const data = await res.json();

      if (data.success) {
        this.showToast('Configuration saved & hot-reloaded!', 'success');
        this.close();
        this.onSavedCallback();
      } else {
        this.showToast(data.message || 'Failed to save configuration', 'error');
      }
    } catch (err) {
      console.error('[DashPark Editor] Save failed:', err);
      this.showToast('Network error while saving configuration', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const existing = document.querySelector('.dashpark-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `dashpark-toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '✕'}</span>
      <span>${this.escapeHtml(message)}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
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
