import type { ServiceItem, Category, DashParkConfig } from '../../shared/types.js';

export interface QuickAddModalOptions {
  getConfig: () => DashParkConfig | null;
  onServiceAdded: (service: ServiceItem, targetCategoryId: string) => Promise<void>;
}

export class QuickAddModal {
  private dialog: HTMLDialogElement | null = null;
  private options: QuickAddModalOptions;

  constructor(options: QuickAddModalOptions) {
    this.options = options;
    this.initDialog();
  }

  private initDialog(): void {
    let dialog = document.getElementById('quick-add-dialog') as HTMLDialogElement | null;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'quick-add-dialog';
      dialog.className = 'quickadd-dialog';
      document.body.appendChild(dialog);
    }
    this.dialog = dialog;
  }

  public open(): void {
    if (!this.dialog) this.initDialog();
    if (!this.dialog) return;

    const config = this.options.getConfig();
    const categories: Category[] = config?.pages?.[0]?.categories || config?.categories || [];

    this.dialog.innerHTML = `
      <div class="quickadd-modal">
        <div class="quickadd-header">
          <h3 class="quickadd-title">⚡ Quick Add Homelab Service</h3>
          <button type="button" class="toast-close" id="quickadd-close-btn">&times;</button>
        </div>

        <div class="quickadd-form-group">
          <label class="quickadd-label" for="quickadd-url-input">Service URL (or IP:Port)</label>
          <input 
            type="text" 
            id="quickadd-url-input" 
            class="quickadd-input" 
            placeholder="e.g. http://192.168.1.50:8096 or https://plex.local" 
            autofocus 
          />
        </div>

        <div class="quickadd-preview-box" id="quickadd-preview-box">
          <span style="font-size: 1.5rem;" id="quickadd-preview-icon">🌐</span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; color: var(--text-primary);" id="quickadd-preview-name">Service Name</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);" id="quickadd-preview-desc">Type a URL above to auto-detect service details</div>
          </div>
        </div>

        <div class="quickadd-form-group">
          <label class="quickadd-label" for="quickadd-name-input">Display Name</label>
          <input type="text" id="quickadd-name-input" class="quickadd-input" placeholder="Service Name" />
        </div>

        <div class="quickadd-form-group">
          <label class="quickadd-label" for="quickadd-category-select">Assign to Category</label>
          <select id="quickadd-category-select" class="quickadd-input" style="cursor: pointer;">
            ${categories
              .map(
                (c, idx) =>
                  `<option value="${c.id}" ${idx === 0 ? 'selected' : ''}>${this.escapeHtml(c.name)}</option>`
              )
              .join('')}
          </select>
        </div>

        <div class="quickadd-actions">
          <button type="button" class="quickadd-btn-cancel" id="quickadd-cancel-btn">Cancel</button>
          <button type="button" class="quickadd-btn-submit" id="quickadd-save-btn">Add Service</button>
        </div>
      </div>
    `;

    const urlInput = this.dialog.querySelector<HTMLInputElement>('#quickadd-url-input');
    const nameInput = this.dialog.querySelector<HTMLInputElement>('#quickadd-name-input');
    const previewName = this.dialog.querySelector<HTMLElement>('#quickadd-preview-name');
    const previewDesc = this.dialog.querySelector<HTMLElement>('#quickadd-preview-desc');
    const closeBtn = this.dialog.querySelector<HTMLButtonElement>('#quickadd-close-btn');
    const cancelBtn = this.dialog.querySelector<HTMLButtonElement>('#quickadd-cancel-btn');
    const saveBtn = this.dialog.querySelector<HTMLButtonElement>('#quickadd-save-btn');
    const categorySelect = this.dialog.querySelector<HTMLSelectElement>('#quickadd-category-select');

    closeBtn?.addEventListener('click', () => this.dialog?.close());
    cancelBtn?.addEventListener('click', () => this.dialog?.close());

    urlInput?.addEventListener('input', () => {
      const url = urlInput.value.trim();
      const detected = this.detectServiceFromUrl(url);

      if (nameInput && (!nameInput.value || nameInput.value === 'Service Name' || nameInput.getAttribute('data-auto') === 'true')) {
        nameInput.value = detected.name;
        nameInput.setAttribute('data-auto', 'true');
      }

      if (previewName) previewName.textContent = detected.name;
      if (previewDesc) previewDesc.textContent = detected.description || url || 'Ready to add';
    });

    saveBtn?.addEventListener('click', async () => {
      const url = urlInput?.value.trim() || '';
      const name = nameInput?.value.trim() || 'New Service';
      const categoryId = categorySelect?.value || categories[0]?.id || 'general';

      if (!url) {
        urlInput?.focus();
        return;
      }

      const detected = this.detectServiceFromUrl(url);
      const newService: ServiceItem = {
        id: `svc-${Date.now()}`,
        name: name || detected.name,
        url: url.startsWith('http') ? url : `http://${url}`,
        icon: detected.icon,
        description: detected.description,
        target: '_blank',
        tags: detected.tags,
      };

      await this.options.onServiceAdded(newService, categoryId);
      this.dialog?.close();
    });

    this.dialog.showModal();
    urlInput?.focus();
  }

  public detectServiceFromUrl(inputUrl: string): { name: string; icon: string; description: string; tags: string[] } {
    const raw = inputUrl.toLowerCase();
    
    if (raw.includes(':8096') || raw.includes('jellyfin')) {
      return { name: 'Jellyfin', icon: 'jellyfin', description: 'Media Streaming Server', tags: ['media', 'streaming'] };
    }
    if (raw.includes(':32400') || raw.includes('plex')) {
      return { name: 'Plex', icon: 'plex', description: 'Plex Media Server', tags: ['media', 'movies'] };
    }
    if (raw.includes(':8989') || raw.includes('sonarr')) {
      return { name: 'Sonarr', icon: 'sonarr', description: 'TV Series Management', tags: ['media', 'automation'] };
    }
    if (raw.includes(':7878') || raw.includes('radarr')) {
      return { name: 'Radarr', icon: 'radarr', description: 'Movie Collection Manager', tags: ['media', 'movies'] };
    }
    if (raw.includes(':8123') || raw.includes('homeassistant') || raw.includes('home-assistant')) {
      return { name: 'Home Assistant', icon: 'homeassistant', description: 'Smart Home Automation', tags: ['smart-home', 'iot'] };
    }
    if (raw.includes(':8006') || raw.includes('proxmox')) {
      return { name: 'Proxmox VE', icon: 'proxmox', description: 'Hypervisor Node', tags: ['infrastructure', 'compute'] };
    }
    if (raw.includes(':9000') || raw.includes(':9443') || raw.includes('portainer')) {
      return { name: 'Portainer', icon: 'portainer', description: 'Container Management', tags: ['docker', 'infra'] };
    }
    if (raw.includes('pihole') || raw.includes('pi-hole')) {
      return { name: 'Pi-hole', icon: 'pihole', description: 'DNS Adblock Sinkhole', tags: ['network', 'dns'] };
    }
    if (raw.includes(':3000') && raw.includes('grafana')) {
      return { name: 'Grafana', icon: 'grafana', description: 'Telemetry Dashboards', tags: ['monitoring', 'metrics'] };
    }

    // Generic fallback extracting domain or hostname
    try {
      const parsed = new URL(inputUrl.startsWith('http') ? inputUrl : `http://${inputUrl}`);
      const host = parsed.hostname.replace(/^www\./, '');
      const capitalized = host.charAt(0).toUpperCase() + host.slice(1).split('.')[0];
      return { name: capitalized || 'Custom Service', icon: 'server', description: host, tags: ['custom'] };
    } catch {
      return { name: 'Custom Service', icon: 'server', description: '', tags: [] };
    }
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
