export interface SystemStatsResponse {
  timestamp: string;
  host: {
    platform: string;
    arch: string;
    hostname: string;
    uptimeSeconds: number;
    cpuCount: number;
    cpuModel: string;
    loadAvg: [number, number, number];
    memory: {
      totalMb: number;
      usedMb: number;
      freeMb: number;
      usagePercent: number;
    };
  };
  dashpark: {
    version: string;
    uptimeSeconds: number;
    heapUsedMb: number;
    rssMb: number;
  };
}

export class SystemWidget {
  private containerId: string;
  private timer: NodeJS.Timeout | null = null;

  constructor(containerId: string = 'system-telemetry-bar') {
    this.containerId = containerId;
    this.fetchAndRender();
    this.timer = setInterval(() => this.fetchAndRender(), 10000);
  }

  public async fetchAndRender(): Promise<void> {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    try {
      const res = await fetch('/api/v1/system/stats');
      if (!res.ok) throw new Error('System stats unavailable');
      const data: SystemStatsResponse = await res.json();

      const host = data.host;
      const memUsedGb = (host.memory.usedMb / 1024).toFixed(1);
      const memTotalGb = (host.memory.totalMb / 1024).toFixed(1);
      const load1m = host.loadAvg[0];
      const uptimeStr = this.formatUptime(host.uptimeSeconds);

      container.innerHTML = `
        <div class="telemetry-bar-inner">
          <div class="telemetry-item">
            <span class="telemetry-label">HOST CPU</span>
            <span class="telemetry-value ${load1m > host.cpuCount ? 'warn' : ''}">
              ${load1m.toFixed(2)} (${host.cpuCount} Cores)
            </span>
          </div>

          <div class="telemetry-item">
            <span class="telemetry-label">HOST RAM</span>
            <span class="telemetry-value ${host.memory.usagePercent > 85 ? 'warn' : ''}">
              ${host.memory.usagePercent}% <span class="telemetry-sub">(${memUsedGb}/${memTotalGb} GB)</span>
            </span>
          </div>

          <div class="telemetry-item">
            <span class="telemetry-label">DASHPARK RAM</span>
            <span class="telemetry-value highlight">
              ${data.dashpark.heapUsedMb} MB <span class="telemetry-sub">(RSS: ${data.dashpark.rssMb} MB)</span>
            </span>
          </div>

          <div class="telemetry-item">
            <span class="telemetry-label">HOST UPTIME</span>
            <span class="telemetry-value">${uptimeStr}</span>
          </div>
        </div>
      `;
    } catch {
      // Hide or show minimal fallback
      if (container) {
        container.innerHTML = '';
      }
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
