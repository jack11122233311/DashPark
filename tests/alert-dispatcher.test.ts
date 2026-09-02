import { describe, it, expect } from 'vitest';
import { AlertDispatcherService } from '../src/server/services/alert-dispatcher.js';
import type { ServiceItem } from '../src/shared/types.js';

describe('Outage Alert Dispatcher (Discord, Telegram, Ntfy, Gotify)', () => {
  const sampleService: ServiceItem = {
    id: 'plex-svc',
    name: 'Plex Media Server',
    url: 'http://192.168.1.100:32400',
  };

  it('should format rich Discord webhook payloads for outages', () => {
    const payload = AlertDispatcherService.formatDiscordPayload(sampleService, 'offline', 'Connection timed out after 5000ms', 5000);
    expect(payload.embeds).toBeDefined();
    expect(payload.embeds[0].title).toContain('Service Alert');
    expect(payload.embeds[0].title).toContain('Plex Media Server');
    expect(payload.embeds[0].color).toBe(15158332); // Red
    expect(payload.embeds[0].fields[0].value).toContain('offline');
  });

  it('should format Telegram markdown message payloads', () => {
    const payload = AlertDispatcherService.formatTelegramPayload(sampleService, 'online', undefined, 45);
    expect(payload.parse_mode).toBe('Markdown');
    expect(payload.text).toContain('Plex Media Server');
    expect(payload.text).toContain('ONLINE');
    expect(payload.text).toContain('45ms');
  });

  it('should format Ntfy notification payloads with tags and priority', () => {
    const payloadOffline = AlertDispatcherService.formatNtfyPayload(sampleService, 'offline', 'HTTP 502 Bad Gateway', 120);
    expect(payloadOffline.priority).toBe(4);
    expect(payloadOffline.tags).toEqual(['warning', 'skull']);
    expect(payloadOffline.message).toContain('HTTP 502 Bad Gateway');

    const payloadOnline = AlertDispatcherService.formatNtfyPayload(sampleService, 'online', undefined, 25);
    expect(payloadOnline.priority).toBe(3);
    expect(payloadOnline.tags).toEqual(['white_check_mark', 'green_circle']);
  });

  it('should format Gotify notification payloads', () => {
    const payload = AlertDispatcherService.formatGotifyPayload(sampleService, 'offline', 'ECONNREFUSED', 0);
    expect(payload.title).toContain('Plex Media Server');
    expect(payload.priority).toBe(8);
    expect(payload.message).toContain('ECONNREFUSED');
  });
});
