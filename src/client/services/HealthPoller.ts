import type { HealthStatus } from '../../shared/types.js';
import type { ToastManager } from '../notifications/ToastManager.js';
import { ChartWidget } from '../widgets/ChartWidget.js';

export interface ServiceHealthData {
  serviceId: string;
  status: HealthStatus;
  latencyMs: number;
  statusCode?: number;
  error?: string;
  lastCheckedAt: string;
}

export interface HealthPollerOptions {
  toastManager?: ToastManager | null;
  getServiceName: (serviceId: string) => string;
  onFilterOffline?: () => void;
  intervalMs?: number;
}

export class HealthPoller {
  private healthDataMap: Map<string, ServiceHealthData> = new Map();
  private latencyHistoryMap: Map<string, number[]> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private options: HealthPollerOptions;

  constructor(options: HealthPollerOptions) {
    this.options = options;
  }

  public start(): void {
    this.stop();
    this.poll();
    this.timer = setInterval(() => this.poll(), this.options.intervalMs || 15000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getHealth(serviceId: string): ServiceHealthData | undefined {
    return this.healthDataMap.get(serviceId);
  }

  public getAllHealth(): Map<string, ServiceHealthData> {
    return this.healthDataMap;
  }

  public async poll(): Promise<void> {
    try {
      const res = await fetch('/api/v1/health/services');
      if (!res.ok) return;
      const data: { services: Record<string, ServiceHealthData> } = await res.json();

      Object.entries(data.services || {}).forEach(([id, result]) => {
        const name = this.options.getServiceName(id) || id;

        // Trigger toast on state changes
        this.options.toastManager?.notifyServiceHealthTransition(
          id,
          name,
          result.status,
          result.latencyMs
        );

        this.healthDataMap.set(id, result);

        // Record sparkline history
        const history = this.latencyHistoryMap.get(id) || [];
        if (result.status === 'online' || result.status === 'degraded') {
          history.push(result.latencyMs);
          if (history.length > 10) history.shift();
          this.latencyHistoryMap.set(id, history);
        }

        this.updateDomBadges(id, result);
      });

      this.updateOutageBanner(data.services || {});
    } catch {
      // Ignore background errors
    }
  }

  private updateDomBadges(serviceId: string, result: ServiceHealthData): void {
    const badges = document.querySelectorAll<HTMLElement>(`[data-health-badge="${serviceId}"]`);
    badges.forEach((badge) => {
      badge.className = `service-latency-badge ${result.status}`;
      if (result.status === 'online' || result.status === 'degraded') {
        badge.textContent = `${result.latencyMs}ms`;
      } else if (result.status === 'offline') {
        badge.textContent = 'Offline';
      }
    });

    const dots = document.querySelectorAll<HTMLElement>(`[data-status-dot="${serviceId}"]`);
    dots.forEach((dot) => {
      dot.className = `service-status-dot ${result.status}`;
    });

    // Render sparklines
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

  private updateOutageBanner(services: Record<string, ServiceHealthData>): void {
    const offlineList = Object.entries(services).filter(([_, s]) => s.status === 'offline');
    let banner = document.getElementById('outage-alert-ribbon');

    if (offlineList.length === 0) {
      banner?.remove();
      return;
    }

    const container = document.getElementById('categories-container');
    if (!container) return;

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'outage-alert-ribbon';
      banner.className = 'outage-alert-ribbon';
      container.parentElement?.insertBefore(banner, container);
    }

    const count = offlineList.length;
    banner.innerHTML = `
      <div class="outage-ribbon-left">
        <span class="outage-ribbon-icon">🚨</span>
        <span>${count} homelab service${count > 1 ? 's are' : ' is'} currently offline</span>
      </div>
      <button type="button" class="outage-ribbon-btn" id="outage-filter-btn">Filter Outages</button>
    `;

    banner.querySelector('#outage-filter-btn')?.addEventListener('click', () => {
      this.options.onFilterOffline?.();
    });
  }
}
