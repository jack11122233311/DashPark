import type { WebhookAlertConfig, ServiceItem, HealthStatus } from '../../shared/types.js';

export interface AlertState {
  serviceId: string;
  consecutiveFailures: number;
  isAlertSent: boolean;
  lastState: HealthStatus;
}

export class AlertDispatcherService {
  private stateMap: Map<string, AlertState> = new Map();

  public async handleServiceStatusChange(
    service: ServiceItem,
    newStatus: HealthStatus,
    error?: string,
    latencyMs?: number,
    webhooks: WebhookAlertConfig[] = []
  ): Promise<void> {
    if (!webhooks || webhooks.length === 0) return;

    let state = this.stateMap.get(service.id);
    if (!state) {
      state = {
        serviceId: service.id,
        consecutiveFailures: 0,
        isAlertSent: false,
        lastState: 'online',
      };
      this.stateMap.set(service.id, state);
    }

    if (newStatus === 'offline') {
      state.consecutiveFailures++;

      // Trigger alerts if consecutive failure count meets threshold and alert not yet sent
      for (const webhook of webhooks) {
        if (!webhook.enabled || !webhook.url) continue;
        const threshold = webhook.consecutiveFailures || 2;

        if (state.consecutiveFailures >= threshold && !state.isAlertSent) {
          state.isAlertSent = true;
          await this.dispatchAlert(webhook, service, 'down', error);
        }
      }
    } else if (newStatus === 'online') {
      // If service recovered from an active alert
      if (state.isAlertSent) {
        state.isAlertSent = false;
        state.consecutiveFailures = 0;

        for (const webhook of webhooks) {
          if (!webhook.enabled || !webhook.url) continue;
          await this.dispatchAlert(webhook, service, 'up', undefined, latencyMs);
        }
      } else {
        state.consecutiveFailures = 0;
      }
    }

    state.lastState = newStatus;
  }

  public static formatDiscordPayload(service: ServiceItem, status: HealthStatus, error?: string, latencyMs?: number): any {
    const isDown = status === 'offline';
    return {
      embeds: [
        {
          title: isDown ? `🚨 DashPark Service Alert: ${service.name} Offline` : `✅ DashPark Service Resolved: ${service.name} Online`,
          description: isDown
            ? `Service **${service.name}** (${service.url}) is unreachable.\n**Reason:** ${error || 'Connection timed out'}`
            : `Service **${service.name}** has recovered and is reachable.\n**Latency:** ${latencyMs ?? 0}ms`,
          color: isDown ? 15158332 : 3066993, // Red / Green
          fields: [
            { name: 'Status', value: status, inline: true },
            { name: 'URL', value: service.url, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'DashPark Homelab Monitor' },
        },
      ],
    };
  }

  public static formatTelegramPayload(service: ServiceItem, status: HealthStatus, error?: string, latencyMs?: number): any {
    const isDown = status === 'offline';
    return {
      text: isDown
        ? `🚨 *DashPark Alert*\n\n*${service.name}* is *OFFLINE*\n🔗 ${service.url}\n❌ ${error || 'Unreachable'}`
        : `✅ *DashPark Resolved*\n\n*${service.name}* is *ONLINE*\n⚡ Latency: ${latencyMs ?? 0}ms`,
      parse_mode: 'Markdown',
    };
  }

  public static formatNtfyPayload(service: ServiceItem, status: HealthStatus, error?: string, latencyMs?: number): any {
    const isDown = status === 'offline';
    return {
      topic: 'dashpark-alerts',
      title: isDown ? `DashPark: ${service.name} Offline` : `DashPark: ${service.name} Online`,
      message: isDown
        ? `Service ${service.name} (${service.url}) is offline. ${error || ''}`
        : `Service ${service.name} is back online (${latencyMs ?? 0}ms).`,
      priority: isDown ? 4 : 3,
      tags: isDown ? ['warning', 'skull'] : ['white_check_mark', 'green_circle'],
    };
  }

  public static formatGotifyPayload(service: ServiceItem, status: HealthStatus, error?: string, latencyMs?: number): any {
    const isDown = status === 'offline';
    return {
      title: isDown ? `DashPark: ${service.name} Offline` : `DashPark: ${service.name} Online`,
      message: isDown
        ? `Service ${service.name} (${service.url}) is offline. ${error || ''}`
        : `Service ${service.name} is back online (${latencyMs ?? 0}ms).`,
      priority: isDown ? 8 : 5,
    };
  }

  public async dispatchAlert(
    webhook: WebhookAlertConfig,
    service: ServiceItem,
    type: 'down' | 'up',
    error?: string,
    latencyMs?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const status: HealthStatus = type === 'down' ? 'offline' : 'online';
      let payload: any;

      if (webhook.type === 'discord') {
        payload = AlertDispatcherService.formatDiscordPayload(service, status, error, latencyMs);
      } else if (webhook.type === 'telegram') {
        payload = AlertDispatcherService.formatTelegramPayload(service, status, error, latencyMs);
      } else if (webhook.type === 'gotify') {
        payload = AlertDispatcherService.formatGotifyPayload(service, status, error, latencyMs);
      } else {
        // ntfy or default
        payload = AlertDispatcherService.formatNtfyPayload(service, status, error, latencyMs);
      }

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });

      return { success: res.ok };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || 'Dispatch failed' };
    }
  }
}

export const globalAlertDispatcher = new AlertDispatcherService();
