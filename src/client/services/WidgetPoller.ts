import type { Category } from '../../shared/types.js';

export interface WidgetData {
  serviceId: string;
  value: string | number;
  label?: string;
  unit?: string;
}

export class WidgetPoller {
  private widgetDataMap: Map<string, WidgetData> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  public getWidgetData(serviceId: string): WidgetData | undefined {
    return this.widgetDataMap.get(serviceId);
  }

  public stopAll(): void {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();
  }

  public updateTargets(categories: Category[]): void {
    this.stopAll();

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
                this.updateBadgeInDom(svc.id, data.value, svc.widget?.label, svc.widget?.unit);
              }
            } catch {
              // Ignore widget poll errors
            }
          };

          // Immediate poll
          poll();
          const intervalMs = (svc.widget.refreshIntervalSeconds || 30) * 1000;
          this.timers.set(svc.id, setInterval(poll, intervalMs));
        }
      });
    });
  }

  private updateBadgeInDom(serviceId: string, value: string | number, label?: string, unit?: string): void {
    const badges = document.querySelectorAll<HTMLElement>(`[data-widget-badge="${serviceId}"]`);
    const formatted = `${label ? label + ': ' : ''}${value}${unit || ''}`;
    badges.forEach((badge) => {
      badge.textContent = formatted;
      badge.style.display = 'inline-flex';
    });
  }
}
