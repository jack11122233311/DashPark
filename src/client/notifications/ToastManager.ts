export type ToastType = 'online' | 'degraded' | 'offline' | 'info';

export interface ToastOptions {
  title: string;
  message: string;
  type?: ToastType;
  durationMs?: number;
}

export class ToastManager {
  private container: HTMLElement | null = null;
  private previousStatuses: Map<string, string> = new Map();

  constructor() {
    this.initContainer();
  }

  private initContainer(): void {
    let existing = document.getElementById('dashpark-toast-container');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'dashpark-toast-container';
      existing.className = 'toast-container';
      document.body.appendChild(existing);
    }
    this.container = existing;
  }

  public show(options: ToastOptions): void {
    if (!this.container) this.initContainer();
    if (!this.container) return;

    const { title, message, type = 'info', durationMs = 4500 } = options;

    const iconMap: Record<ToastType, string> = {
      online: '🟢',
      degraded: '🟡',
      offline: '🔴',
      info: '⚡',
    };

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type]}</span>
      <div class="toast-body">
        <span class="toast-title">${this.escapeHtml(title)}</span>
        <span class="toast-message">${this.escapeHtml(message)}</span>
      </div>
      <button type="button" class="toast-close" title="Dismiss">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => {
      this.dismiss(toast);
    });

    this.container.appendChild(toast);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, durationMs);
    }
  }

  private dismiss(toast: HTMLElement): void {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => {
      toast.remove();
    }, 200);
  }

  public notifyServiceHealthTransition(serviceId: string, serviceName: string, newStatus: string, latencyMs?: number): void {
    const prev = this.previousStatuses.get(serviceId);
    this.previousStatuses.set(serviceId, newStatus);

    if (!prev || prev === newStatus) return;

    if (newStatus === 'offline') {
      this.show({
        title: `${serviceName} is Offline`,
        message: `Endpoint unreachable or returning server error.`,
        type: 'offline',
        durationMs: 6000,
      });
    } else if (newStatus === 'degraded') {
      this.show({
        title: `${serviceName} Degraded`,
        message: `High latency detected: ${latencyMs}ms.`,
        type: 'degraded',
        durationMs: 5000,
      });
    } else if (newStatus === 'online' && prev === 'offline') {
      this.show({
        title: `${serviceName} Restored`,
        message: `Service is back online (${latencyMs}ms).`,
        type: 'online',
        durationMs: 4000,
      });
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
