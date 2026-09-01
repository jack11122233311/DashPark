import type { DashParkConfig, Category, ServiceItem } from '../../shared/types.js';
import { stringify as stringifyYaml } from 'yaml';

export class ConfigEditor {
  private dialog: HTMLDialogElement | null = null;
  private currentConfig: DashParkConfig | null = null;
  private rawYaml: string = '';
  private activeTab: 'visual' | 'yaml' = 'visual';
  private validationDebounceTimer: NodeJS.Timeout | null = null;
  private onSavedCallback: () => void;

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
        const tab = btn.getAttribute('data-tab') as 'visual' | 'yaml';
        if (tab) this.switchTab(tab);
      });
    });

    // Save button
    const saveBtn = document.getElementById('editor-save-btn');
    saveBtn?.addEventListener('click', () => this.handleSave());

    // Cancel button
    const cancelBtn = document.getElementById('editor-cancel-btn');
    cancelBtn?.addEventListener('click', () => this.close());

    // YAML Textarea live validation
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

      this.renderVisualForm();
      this.renderYamlEditor();
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

  private switchTab(tab: 'visual' | 'yaml'): void {
    this.activeTab = tab;

    document.querySelectorAll('.editor-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    const visualPane = document.getElementById('editor-visual-pane');
    const yamlPane = document.getElementById('editor-yaml-pane');

    if (tab === 'visual') {
      if (visualPane) visualPane.classList.add('active');
      if (yamlPane) yamlPane.classList.remove('active');
      this.renderVisualForm();
    } else {
      if (visualPane) visualPane.classList.remove('active');
      if (yamlPane) yamlPane.classList.add('active');
      // Sync YAML textarea from current visual state if modified
      if (this.currentConfig) {
        this.rawYaml = stringifyYaml(this.currentConfig);
      }
      this.renderYamlEditor();
    }
  }

  private renderVisualForm(): void {
    const container = document.getElementById('visual-categories-list');
    if (!container || !this.currentConfig) return;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1rem; font-weight: 700;">Categories & Services</h3>
        <button type="button" class="btn-secondary" id="btn-add-category">+ Add Category</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${this.currentConfig.categories
          .map((cat, catIdx) => this.renderCategoryItem(cat, catIdx))
          .join('')}
      </div>
    `;

    // Hook add category button
    document.getElementById('btn-add-category')?.addEventListener('click', () => {
      const name = prompt('Enter new category name (e.g. Monitoring, Media, Security):');
      if (name && name.trim()) {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        this.currentConfig?.categories.push({
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

  private renderCategoryItem(cat: Category, catIdx: number): string {
    return `
      <div class="visual-category-card" data-cat-index="${catIdx}">
        <div class="visual-category-header">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
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
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button type="button" class="btn-secondary btn-add-service" data-cat-index="${catIdx}">+ Add Service</button>
            <button type="button" class="btn-secondary btn-delete-cat" data-cat-index="${catIdx}" style="color: var(--status-offline);" title="Delete Category">✕</button>
          </div>
        </div>

        <div class="visual-services-list">
          ${
            cat.services.length === 0
              ? `<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">No services in this category. Click "+ Add Service" to add one.</div>`
              : cat.services
                  .map((svc, svcIdx) => this.renderServiceItem(svc, catIdx, svcIdx))
                  .join('')
          }
        </div>
      </div>
    `;
  }

  private renderServiceItem(svc: ServiceItem, catIdx: number, svcIdx: number): string {
    return `
      <div class="visual-service-item" data-cat-index="${catIdx}" data-svc-index="${svcIdx}" style="display: flex; flex-direction: column; gap: 0.5rem; align-items: stretch;">
        <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
            <input 
              type="text" 
              class="form-input svc-name-input" 
              value="${this.escapeHtml(svc.name)}" 
              data-cat-index="${catIdx}" 
              data-svc-index="${svcIdx}"
              placeholder="Service Name" 
              style="width: 160px; font-weight: 600;"
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
              style="width: 120px; font-family: var(--font-mono); font-size: 0.8125rem;"
            />
          </div>

          <div class="service-item-actions">
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

        <!-- Optional Widget Configuration Accordion -->
        <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.75rem;">
          <span style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">📊 Live Widget API:</span>
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
            style="width: 150px; font-size: 0.75rem; padding: 0.25rem 0.5rem; font-family: var(--font-mono);"
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
          <button 
            type="button" 
            class="btn-secondary btn-test-widget" 
            data-cat-index="${catIdx}" 
            data-svc-index="${svcIdx}"
            style="font-size: 0.6875rem; padding: 0.2rem 0.5rem;"
            title="Test JSON API response"
          >
            🧪 Test API
          </button>
        </div>
      </div>
    `;
  }

  private attachVisualEventListeners(): void {
    // Category Name input
    document.querySelectorAll<HTMLInputElement>('.cat-name-input').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        if (this.currentConfig?.categories[catIdx]) {
          this.currentConfig.categories[catIdx].name = input.value;
        }
      });
    });

    // Category Icon input
    document.querySelectorAll<HTMLInputElement>('.cat-icon-input').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        if (this.currentConfig?.categories[catIdx]) {
          this.currentConfig.categories[catIdx].icon = input.value;
        }
      });
    });

    // Delete category
    document.querySelectorAll<HTMLButtonElement>('.btn-delete-cat').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        if (this.currentConfig && confirm(`Delete category "${this.currentConfig.categories[catIdx]?.name}"?`)) {
          this.currentConfig.categories.splice(catIdx, 1);
          this.renderVisualForm();
        }
      });
    });

    // Add service
    document.querySelectorAll<HTMLButtonElement>('.btn-add-service').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const name = prompt('Service Name (e.g. Nextcloud, Portainer):');
        if (name && name.trim()) {
          const url = prompt('Service URL (e.g. http://192.168.1.100:8080):', 'http://');
          if (url && url.trim()) {
            const cleanId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            this.currentConfig?.categories[catIdx].services.push({
              id: cleanId || `svc_${Date.now()}`,
              name: name.trim(),
              url: url.trim(),
              icon: cleanId,
              target: '_blank',
              tags: [],
            });
            this.renderVisualForm();
          }
        }
      });
    });

    // Service Inputs
    document.querySelectorAll<HTMLInputElement>('.svc-name-input').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        if (this.currentConfig?.categories[catIdx]?.services[svcIdx]) {
          this.currentConfig.categories[catIdx].services[svcIdx].name = input.value;
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-url-input').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        if (this.currentConfig?.categories[catIdx]?.services[svcIdx]) {
          this.currentConfig.categories[catIdx].services[svcIdx].url = input.value;
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-icon-input').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        if (this.currentConfig?.categories[catIdx]?.services[svcIdx]) {
          this.currentConfig.categories[catIdx].services[svcIdx].icon = input.value;
        }
      });
    });

    // Delete service
    document.querySelectorAll<HTMLButtonElement>('.btn-delete-svc').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        if (this.currentConfig?.categories[catIdx]?.services) {
          this.currentConfig.categories[catIdx].services.splice(svcIdx, 1);
          this.renderVisualForm();
        }
      });
    });

    // Widget inputs
    document.querySelectorAll<HTMLInputElement>('.svc-widget-url').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const svc = this.currentConfig?.categories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.url = input.value;
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-widget-key').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const svc = this.currentConfig?.categories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.jsonPath = input.value;
        }
      });
    });

    document.querySelectorAll<HTMLInputElement>('.svc-widget-label').forEach((input) => {
      input.addEventListener('change', () => {
        const catIdx = parseInt(input.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(input.getAttribute('data-svc-index') || '0', 10);
        const svc = this.currentConfig?.categories[catIdx]?.services[svcIdx];
        if (svc) {
          if (!svc.widget) svc.widget = { type: 'stat' };
          svc.widget.label = input.value;
        }
      });
    });

    // Test Widget API button
    document.querySelectorAll<HTMLButtonElement>('.btn-test-widget').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const catIdx = parseInt(btn.getAttribute('data-cat-index') || '0', 10);
        const svcIdx = parseInt(btn.getAttribute('data-svc-index') || '0', 10);
        const svc = this.currentConfig?.categories[catIdx]?.services[svcIdx];
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
    if (this.activeTab === 'visual' && this.currentConfig) {
      payloadContent = stringifyYaml(this.currentConfig);
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
