import { describe, it, expect } from 'vitest';
import { DomRenderer } from '../src/client/dom/DomRenderer.js';
import type { ServiceItem } from '../src/shared/types.js';

describe('DomRenderer Component', () => {
  const mockService: ServiceItem = {
    id: 'svc-plex',
    name: 'Plex & Movies <tag>',
    url: 'http://192.168.1.50:32400',
    icon: 'plex',
    description: 'Plex "Media" Server',
    tags: ['media', 'movies'],
  };

  it('escapes HTML special characters properly to prevent XSS', () => {
    const raw = '<script>alert("xss")</script> & \'test\'';
    const escaped = DomRenderer.escapeHtml(raw);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&quot;');
  });

  it('computes category health rollup accurately', () => {
    const services: ServiceItem[] = [
      { id: 's1', name: 'S1', url: 'http://s1' },
      { id: 's2', name: 'S2', url: 'http://s2' },
      { id: 's3', name: 'S3', url: 'http://s3' },
    ];

    const healthMap = new Map([
      ['s1', { status: 'online' as const, latencyMs: 25 }],
      ['s2', { status: 'online' as const, latencyMs: 30 }],
      ['s3', { status: 'online' as const, latencyMs: 40 }],
    ]);

    const allOnline = DomRenderer.computeCategoryHealthRollup(services, healthMap);
    expect(allOnline.cssClass).toBe('all-online');
    expect(allOnline.text).toContain('3/3');

    healthMap.set('s3', { status: 'offline' as const, latencyMs: 0 });
    const hasOffline = DomRenderer.computeCategoryHealthRollup(services, healthMap);
    expect(hasOffline.cssClass).toBe('has-offline');
    expect(hasOffline.text).toContain('1 Offline');
  });

  it('renders standard card, bento card, and compact row HTML with correct attributes', () => {
    const stdHtml = DomRenderer.renderStandardCard(mockService, 'film');
    expect(stdHtml).toContain('data-service-id="svc-plex"');
    expect(stdHtml).toContain('Plex &amp; Movies &lt;tag&gt;');

    const bentoHtml = DomRenderer.renderBentoCard(mockService, 'Media', 'film');
    expect(bentoHtml).toContain('bento-card');
    expect(bentoHtml).toContain('bento-category-badge');

    const compactHtml = DomRenderer.renderCompactRow(mockService, 'Media', 'film');
    expect(compactHtml).toContain('compact-row');
    expect(compactHtml).toContain('compact-name-cell');
  });
});
