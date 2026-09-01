import { describe, it, expect, beforeEach } from 'vitest';
import { IconResolver } from '../src/client/icons/IconResolver.js';
import { SVG_ICONS } from '../src/client/icons/lucide-svgs.js';

describe('DashPark Smart Icon Resolver Engine', () => {
  let resolver: IconResolver;

  beforeEach(() => {
    resolver = new IconResolver();
  });

  it('should clean and normalize icon identifiers properly', () => {
    expect(resolver.cleanIdentifier('Plex Media')).toBe('plex-media');
    expect(resolver.cleanIdentifier('Pi_Hole!')).toBe('pi-hole');
    expect(resolver.cleanIdentifier('Home Assistant')).toBe('home-assistant');
  });

  it('should safely extract domain hostname from service URLs', () => {
    expect(resolver.extractDomain('https://plex.local:32400/web/index.html')).toBe('plex.local');
    expect(resolver.extractDomain('http://192.168.1.50:8080')).toBe('192.168.1.50');
    expect(resolver.extractDomain('invalid-url')).toBeNull();
    expect(resolver.extractDomain(undefined)).toBeNull();
  });

  it('should generate 2-letter uppercase initials for badge fallback', () => {
    expect(resolver.getInitials('Plex Media Server')).toBe('PM');
    expect(resolver.getInitials('Sonarr')).toBe('SO');
    expect(resolver.getInitials('Proxmox VE')).toBe('PV');
    expect(resolver.getInitials('')).toBe('DP');
  });

  it('should build candidate cascade URLs in strict priority order', () => {
    const urls = resolver.getCandidateUrls('plex', 'http://plex.local:32400');

    // 3 local formats + 2 dashboard-icons formats + 1 SimpleIcons + 1 Favicon Proxy = 7 total
    expect(urls).toHaveLength(7);
    // Tier 1: Local /icons/
    expect(urls[0]).toBe('/icons/plex.png');
    expect(urls[1]).toBe('/icons/plex.svg');
    expect(urls[2]).toBe('/icons/plex.webp');
    // Tier 2: Dashboard Icons (PNG and SVG)
    expect(urls[3]).toContain('walkxcode/dashboard-icons/png/plex.png');
    expect(urls[4]).toContain('walkxcode/dashboard-icons/svg/plex.svg');
    // Tier 3: Simple Icons
    expect(urls[5]).toContain('cdn.simpleicons.org/plex');
    // Tier 4: Domain Favicon Proxy
    expect(urls[6]).toBe('/api/v1/icons/favicon?domain=plex.local');
  });

  it('should include backend domain favicon proxy in cascade when serviceUrl is provided', () => {
    const urls = resolver.getCandidateUrls(undefined, 'https://router.local:8443');
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('/api/v1/icons/favicon?domain=router.local');
  });

  it('should resolve keyword-based Lucide SVG vector fallback', () => {
    expect(resolver.getLucideFallback('film', 'Plex')).toBe(SVG_ICONS.film);
    expect(resolver.getLucideFallback('server', 'Proxmox Node')).toBe(SVG_ICONS.server);
    expect(resolver.getLucideFallback(undefined, 'Pi-hole DNS Server')).toBe(SVG_ICONS.network);
    expect(resolver.getLucideFallback(undefined, 'Vaultwarden Password Safe')).toBe(SVG_ICONS['shield-check']);
    expect(resolver.getLucideFallback(undefined, 'Custom Random App')).toBe(SVG_ICONS.folder);
  });

  it('should render clean icon container with candidate attributes for zero layout shift', () => {
    const html = resolver.renderIcon({
      serviceName: 'Sonarr',
      iconIdentifier: 'sonarr',
      serviceUrl: 'http://sonarr.local:8989',
      categoryIcon: 'film',
    });

    expect(html).toContain('class="dashpark-icon-wrapper"');
    expect(html).toContain('data-cache-key="sonarr_http://sonarr.local:8989"');
    expect(html).toContain('data-candidates=');
    expect(html).toContain('class="dashpark-icon-img"');
  });
});
