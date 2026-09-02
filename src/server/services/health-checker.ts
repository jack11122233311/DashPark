import type { HealthStatus, ServiceItem, DashParkConfig, WebhookAlertConfig } from '../../shared/types.js';
import { APP_VERSION } from '../../shared/version.js';
import { globalAlertDispatcher } from './alert-dispatcher.js';

// Allow self-signed certificates for local homelab environments (e.g. Proxmox, Portainer, TrueNAS, Emby)
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export interface ServiceHealthResult {
  serviceId: string;
  status: HealthStatus;
  latencyMs: number;
  statusCode?: number;
  error?: string;
  lastCheckedAt: string;
}

export class HealthCheckerService {
  private statusMap: Map<string, ServiceHealthResult> = new Map();
  private intervalTimer: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;
  private pollIntervalMs: number = 30000;
  private currentServices: ServiceItem[] = [];
  private currentWebhooks: WebhookAlertConfig[] = [];

  constructor(pollIntervalMs: number = 30000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Performs an on-demand HTTP health ping to a single URL
   */
  public async pingUrl(targetUrl: string, timeoutMs: number = 3500): Promise<{
    status: HealthStatus;
    latencyMs: number;
    statusCode?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Prefer HEAD, fallback to GET if HEAD rejected
      let response: Response;
      const userAgent = `DashPark-HealthMonitor/${APP_VERSION} (Homelab Health Check)`;

      try {
        response = await fetch(targetUrl, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': userAgent,
            Accept: '*/*',
          },
        });
      } catch {
        // Retry with GET for services that don't support HEAD or require full handshake
        response = await fetch(targetUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': userAgent,
            Accept: '*/*',
          },
        });
      }

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const statusCode = response.status;

      // Online: 2xx or 3xx status with healthy response time
      if (statusCode >= 200 && statusCode < 400) {
        return {
          status: latencyMs > 1000 ? 'degraded' : 'online',
          latencyMs,
          statusCode,
        };
      }

      // 401 / 403: Endpoint is alive and reachable, but protected by basic auth / login
      if (statusCode === 401 || statusCode === 403) {
        return {
          status: 'online', // Service is up and responding
          latencyMs,
          statusCode,
        };
      }

      // 4xx or 5xx error
      return {
        status: 'degraded',
        latencyMs,
        statusCode,
        error: `HTTP ${statusCode}`,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const isAbort = (err as Error)?.name === 'AbortError';

      return {
        status: 'offline',
        latencyMs,
        error: isAbort ? 'Connection timed out (>3.5s)' : (err as Error)?.message || 'Connection failed',
      };
    }
  }

  /**
   * Pings a single service using its pingUrl or primary url
   */
  public async checkService(service: ServiceItem): Promise<ServiceHealthResult> {
    const targetUrl = service.pingUrl || service.url;
    const result = await this.pingUrl(targetUrl);

    const healthResult: ServiceHealthResult = {
      serviceId: service.id,
      status: result.status,
      latencyMs: result.latencyMs,
      statusCode: result.statusCode,
      error: result.error,
      lastCheckedAt: new Date().toISOString(),
    };

    this.statusMap.set(service.id, healthResult);

    // Dispatch webhook alerts on outage / recovery
    if (this.currentWebhooks.length > 0) {
      globalAlertDispatcher
        .handleServiceStatusChange(
          service,
          result.status,
          result.error,
          result.latencyMs,
          this.currentWebhooks
        )
        .catch((err) => {
          console.warn('[DashPark Alerts] Dispatch error:', err);
        });
    }

    return healthResult;
  }

  /**
   * Checks all services with concurrency throttling (max 5 simultaneous) and jitter
   */
  public async checkAllServices(services: ServiceItem[], maxConcurrency: number = 5): Promise<void> {
    if (this.isChecking || services.length === 0) return;
    this.isChecking = true;

    try {
      const queue = [...services];
      const runningPromises: Promise<void>[] = [];

      const processNext = async () => {
        const service = queue.shift();
        if (!service) return;

        // Add a small jitter (10ms - 40ms) to avoid simultaneous bursts
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 30) + 10));
        await this.checkService(service);

        if (queue.length > 0) {
          await processNext();
        }
      };

      const workerCount = Math.min(maxConcurrency, services.length);
      for (let i = 0; i < workerCount; i++) {
        runningPromises.push(processNext());
      }

      await Promise.all(runningPromises);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Updates the target list of services from a parsed DashPark config
   */
  public updateConfig(config: DashParkConfig): void {
    const allServices: ServiceItem[] = [];
    if (config.pages && config.pages.length > 0) {
      config.pages.forEach((page) => {
        page.categories.forEach((cat) => {
          cat.services.forEach((s) => allServices.push(s));
        });
      });
    } else if (config.categories) {
      config.categories.forEach((cat) => {
        cat.services.forEach((s) => allServices.push(s));
      });
    }
    this.currentServices = allServices;
    this.currentWebhooks = config.meta?.alerts?.webhooks || [];

    // Trigger immediate background check
    this.checkAllServices(this.currentServices).catch((err) => {
      console.warn('[DashPark Health] Background check error:', err);
    });
  }

  /**
   * Starts the background health check timer
   */
  public start(config?: DashParkConfig): void {
    if (config) {
      this.updateConfig(config);
    }

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    this.intervalTimer = setInterval(() => {
      if (this.currentServices.length > 0) {
        this.checkAllServices(this.currentServices).catch((err) => {
          console.warn('[DashPark Health] Periodic check error:', err);
        });
      }
    }, this.pollIntervalMs);
  }

  /**
   * Stops the background health check timer
   */
  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Returns current health map as an object
   */
  public getAllStatuses(): Record<string, ServiceHealthResult> {
    const obj: Record<string, ServiceHealthResult> = {};
    this.statusMap.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }

  public getStatus(serviceId: string): ServiceHealthResult | undefined {
    return this.statusMap.get(serviceId);
  }
}

export const globalHealthChecker = new HealthCheckerService(30000);
