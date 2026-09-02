export interface DetailedSystemStats {
  timestamp: string;
  host: {
    platform: string;
    arch: string;
    hostname: string;
    uptimeSeconds: number;
    cpuCount: number;
    cpuModel: string;
    cpuUsagePercent?: number;
    loadAvg: [number, number, number];
    memory: {
      totalMb: number;
      usedMb: number;
      freeMb: number;
      usagePercent: number;
    };
    disk?: {
      totalGb: number;
      usedGb: number;
      freeGb: number;
      usagePercent: number;
      mountPath: string;
    };
  };
  dashpark: {
    version: string;
    uptimeSeconds: number;
    heapUsedMb: number;
    rssMb: number;
  };
}

export class HostStatsCard {
  private containerId: string;
  private timer: NodeJS.Timeout | null = null;
  private isCollapsed: boolean = false;
  private latestStats: DetailedSystemStats | null = null;

  constructor(containerId: string = 'host-telemetry-cards-container') {
    this.containerId = containerId;
    this.loadPreferences();
  }

  private loadPreferences(): void {
    try {
      const collapsed = localStorage.getItem('dashpark_host_stats_collapsed');
      if (collapsed === 'true') this.isCollapsed = true;
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
      container.className = 'host-telemetry-cards-container';
      categoriesEl.parentElement?.insertBefore(container, categoriesEl);
    }

    this.poll();
    this.timer = setInterval(() => this.poll(), 5000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async poll(): Promise<void> {
    try {
      const res = await fetch('/api/v1/system/stats');
      if (!res.ok) return;
      const data: DetailedSystemStats = await res.json();
      this.latestStats = data;
      this.render();
    } catch {
      // Ignore errors
    }
  }

  public render(): void {
    const container = document.getElementById(this.containerId);
    if (!container || !this.latestStats) return;

    const { host, dashpark } = this.latestStats;
    const memTotalGb = (host.memory.totalMb / 1024).toFixed(1);
    const memUsedGb = (host.memory.usedMb / 1024).toFixed(1);
    const memFreeGb = (host.memory.freeMb / 1024).toFixed(1);
    const uptimeFormatted = this.formatUptime(host.uptimeSeconds);

    const cpuPct = host.cpuUsagePercent ?? Math.min(100, Math.round(host.loadAvg[0] * 10 * 10) / 10);
    const disk = host.disk || { totalGb: 0, usedGb: 0, freeGb: 0, usagePercent: 0, mountPath: '/' };

    container.innerHTML = `
      <div class="host-stats-card ${this.isCollapsed ? 'collapsed' : ''}">
        <div class="host-stats-header">
          <div class="host-stats-title-group">
            <span class="host-stats-icon">📊</span>
            <h3 class="host-stats-title">Host Server Telemetry</h3>
            <span class="host-badge">${this.escapeHtml(host.hostname)} (${this.escapeHtml(host.platform)}/${this.escapeHtml(host.arch)})</span>
            <span class="host-badge uptime-badge">⏱️ Up ${uptimeFormatted}</span>
          </div>
          <button type="button" class="rss-action-btn" id="host-stats-toggle-btn" title="${this.isCollapsed ? 'Expand' : 'Collapse'}">
            ${this.isCollapsed ? '▼' : '▲'}
          </button>
        </div>

        <div class="host-stats-grid ${this.isCollapsed ? 'hidden' : ''}">
          <!-- CPU Gauge Card -->
          <div class="telemetry-stat-tile">
            <div class="stat-tile-header">
              <span class="stat-label">CPU Load</span>
              <span class="stat-val ${cpuPct > 85 ? 'text-rose' : cpuPct > 60 ? 'text-amber' : 'text-emerald'}">${cpuPct}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill cpu-fill" style="width: ${Math.min(100, cpuPct)}%;"></div>
            </div>
            <div class="stat-tile-sub">
              <span>${host.cpuCount} Cores • Load ${host.loadAvg[0]} / ${host.loadAvg[1]} / ${host.loadAvg[2]}</span>
            </div>
          </div>

          <!-- Memory RAM Gauge Card -->
          <div class="telemetry-stat-tile">
            <div class="stat-tile-header">
              <span class="stat-label">Memory RAM</span>
              <span class="stat-val ${host.memory.usagePercent > 85 ? 'text-rose' : host.memory.usagePercent > 60 ? 'text-amber' : 'text-emerald'}">${host.memory.usagePercent}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill mem-fill" style="width: ${Math.min(100, host.memory.usagePercent)}%;"></div>
            </div>
            <div class="stat-tile-sub">
              <span>${memUsedGb} GB / ${memTotalGb} GB (${memFreeGb} GB Free)</span>
            </div>
          </div>

          <!-- Storage Disk Gauge Card -->
          <div class="telemetry-stat-tile">
            <div class="stat-tile-header">
              <span class="stat-label">Storage (${this.escapeHtml(disk.mountPath)})</span>
              <span class="stat-val ${disk.usagePercent > 85 ? 'text-rose' : disk.usagePercent > 60 ? 'text-amber' : 'text-emerald'}">${disk.usagePercent}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill disk-fill" style="width: ${Math.min(100, disk.usagePercent)}%;"></div>
            </div>
            <div class="stat-tile-sub">
              <span>${disk.usedGb} GB / ${disk.totalGb} GB (${disk.freeGb} GB Free)</span>
            </div>
          </div>

          <!-- Process Info -->
          <div class="telemetry-stat-tile">
            <div class="stat-tile-header">
              <span class="stat-label">DashPark Process</span>
              <span class="stat-val text-indigo">${dashpark.heapUsedMb} MB</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill app-fill" style="width: ${Math.min(100, (dashpark.heapUsedMb / 50) * 100)}%;"></div>
            </div>
            <div class="stat-tile-sub">
              <span>RSS: ${dashpark.rssMb} MB • v${dashpark.version}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const toggleBtn = container.querySelector('#host-stats-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      try {
        localStorage.setItem('dashpark_host_stats_collapsed', String(this.isCollapsed));
      } catch {
        // Ignore
      }
      this.render();
    });
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
