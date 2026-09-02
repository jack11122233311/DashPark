export class ScratchpadWidget {
  private containerId: string;
  private isCollapsed: boolean = true;
  private content: string = '';
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(containerId: string = 'scratchpad-widget-container') {
    this.containerId = containerId;
    this.load();
  }

  private load(): void {
    try {
      this.content = localStorage.getItem('dashpark_scratchpad_notes') || '';
      const collapsed = localStorage.getItem('dashpark_scratchpad_collapsed');
      if (collapsed !== null) {
        this.isCollapsed = collapsed === 'true';
      }
    } catch {
      // Ignore
    }
  }

  public init(): void {
    let container = document.getElementById(this.containerId);
    if (!container) {
      const categoriesEl = document.getElementById('categories-container');
      if (!categoriesEl) return;
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'scratchpad-widget-container';
      categoriesEl.parentElement?.insertBefore(container, categoriesEl);
    }

    this.render();
  }

  public render(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="scratchpad-card ${this.isCollapsed ? 'collapsed' : ''}">
        <div class="scratchpad-header">
          <div class="scratchpad-title-group">
            <span class="scratchpad-icon">📝</span>
            <h3 class="scratchpad-title">Quick Scratchpad & Notes</h3>
            <span class="scratchpad-badge">Auto-saved</span>
          </div>
          <button type="button" class="rss-action-btn" id="scratchpad-toggle-btn" title="${this.isCollapsed ? 'Expand' : 'Collapse'}">
            ${this.isCollapsed ? '▼' : '▲'}
          </button>
        </div>

        <div class="scratchpad-body ${this.isCollapsed ? 'hidden' : ''}">
          <textarea 
            id="scratchpad-textarea" 
            class="scratchpad-textarea" 
            placeholder="Type quick notes, IP addresses, port numbers, or commands here (saved automatically)..."
            rows="4"
          >${this.escapeHtml(this.content)}</textarea>
        </div>
      </div>
    `;

    const textarea = container.querySelector<HTMLTextAreaElement>('#scratchpad-textarea');
    textarea?.addEventListener('input', () => {
      this.content = textarea.value;
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        try {
          localStorage.setItem('dashpark_scratchpad_notes', this.content);
        } catch {
          // Ignore
        }
      }, 500);
    });

    const toggleBtn = container.querySelector('#scratchpad-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      try {
        localStorage.setItem('dashpark_scratchpad_collapsed', String(this.isCollapsed));
      } catch {
        // Ignore
      }
      this.render();
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
