import { SVG_ICONS } from './lucide-svgs.js';

const CACHE_KEY_WORKING = 'dashpark_icon_cache_v1';
const CACHE_KEY_FAILED = 'dashpark_icon_failed_v1';

export class IconResolver {
  private workingCache: Map<string, string> = new Map();
  private failedCache: Set<string> = new Set();

  constructor() {
    this.loadStorageCache();
  }

  private loadStorageCache(): void {
    try {
      const working = localStorage.getItem(CACHE_KEY_WORKING);
      if (working) {
        const parsed = JSON.parse(working);
        Object.entries(parsed).forEach(([k, v]) => this.workingCache.set(k, v as string));
      }
      const failed = localStorage.getItem(CACHE_KEY_FAILED);
      if (failed) {
        const parsed: string[] = JSON.parse(failed);
        parsed.forEach((url) => this.failedCache.add(url));
      }
    } catch {
      // Storage access might be disabled or restricted
    }
  }

  private persistCache(): void {
    try {
      const workingObj: Record<string, string> = {};
      this.workingCache.forEach((v, k) => {
        workingObj[k] = v;
      });
      localStorage.setItem(CACHE_KEY_WORKING, JSON.stringify(workingObj));
      localStorage.setItem(CACHE_KEY_FAILED, JSON.stringify(Array.from(this.failedCache)));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Cleans icon name identifiers (e.g. 'pi-hole' -> 'pi-hole', 'plex media' -> 'plex')
   */
  public cleanIdentifier(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Safely extracts hostname from a service URL
   */
  public extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Generates candidate URL cascade list for an icon
   */
  public getCandidateUrls(iconIdentifier?: string, serviceUrl?: string): string[] {
    const urls: string[] = [];

    if (iconIdentifier) {
      const trimmed = iconIdentifier.trim();

      // Direct URL or absolute path
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return [trimmed];
      }

      const clean = this.cleanIdentifier(trimmed);

      // Tier 1: Local custom icon in /icons/
      urls.push(`/icons/${clean}.png`);
      urls.push(`/icons/${clean}.svg`);
      urls.push(`/icons/${clean}.webp`);

      // Tier 2: walkxcode/dashboard-icons (PNG & SVG)
      urls.push(`https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${clean}.png`);
      urls.push(`https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/${clean}.svg`);

      // Tier 3: Simple Icons CDN
      urls.push(`https://cdn.simpleicons.org/${clean}`);
    }

    // Tier 4: Domain Favicon via Backend Proxy
    const domain = this.extractDomain(serviceUrl);
    if (domain) {
      urls.push(`/api/v1/icons/favicon?domain=${encodeURIComponent(domain)}`);
    }

    return urls;
  }

  /**
   * Generates 2-letter uppercase initials
   */
  public getInitials(name: string): string {
    if (!name) return 'DP';
    const words = name.trim().split(/[\s-_]+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Determines the best Lucide SVG vector for a category or service
   */
  public getLucideFallback(categoryIcon?: string, serviceName?: string): string {
    const catKey = (categoryIcon || '').toLowerCase();
    if (SVG_ICONS[catKey]) {
      return SVG_ICONS[catKey];
    }

    const name = (serviceName || '').toLowerCase();
    if (name.includes('network') || name.includes('dns') || name.includes('pihole') || name.includes('pi-hole') || name.includes('adguard') || name.includes('router') || name.includes('switch')) {
      return SVG_ICONS.network;
    }
    if (name.includes('guard') || name.includes('shield') || name.includes('auth') || name.includes('vault') || name.includes('pass') || name.includes('security')) {
      return SVG_ICONS['shield-check'];
    }
    if (name.includes('media') || name.includes('plex') || name.includes('jellyfin') || name.includes('tv') || name.includes('movie') || name.includes('sonarr') || name.includes('radarr')) {
      return SVG_ICONS.film;
    }
    if (name.includes('cloud') || name.includes('drive') || name.includes('nextcloud') || name.includes('owncloud')) {
      return SVG_ICONS.cloud;
    }
    if (name.includes('home') || name.includes('iot') || name.includes('hass') || name.includes('assistant')) {
      return SVG_ICONS.home;
    }
    if (name.includes('server') || name.includes('node') || name.includes('host') || name.includes('proxmox') || name.includes('truenas') || name.includes('portainer') || name.includes('docker')) {
      return SVG_ICONS.server;
    }

    return SVG_ICONS.folder;
  }

  /**
   * Marks a candidate URL as failed to prevent repeated failed network requests
   */
  public markFailed(url: string): void {
    this.failedCache.add(url);
    this.persistCache();
  }

  /**
   * Marks a candidate URL as working for instant future hits
   */
  public markWorking(cacheKey: string, url: string): void {
    this.workingCache.set(cacheKey, url);
    this.persistCache();
  }

  /**
   * Returns complete HTML for an icon with zero-layout-shift container and multi-tier fallback
   */
  public renderIcon(params: {
    serviceName: string;
    iconIdentifier?: string;
    serviceUrl?: string;
    categoryIcon?: string;
    size?: number;
  }): string {
    const { serviceName, iconIdentifier, serviceUrl, categoryIcon, size = 44 } = params;
    const cacheKey = `${iconIdentifier || ''}_${serviceUrl || ''}`;
    const initials = this.getInitials(serviceName);
    const lucideSvg = this.getLucideFallback(categoryIcon, serviceName);

    const candidateUrls = this.getCandidateUrls(iconIdentifier, serviceUrl).filter(
      (url) => !this.failedCache.has(url)
    );

    const primaryUrl = this.workingCache.get(cacheKey) || candidateUrls[0];
    const candidateListAttr = candidateUrls.join('|');

    return `
      <div 
        class="dashpark-icon-wrapper" 
        style="width: ${size}px; height: ${size}px;"
        data-cache-key="${this.escapeHtml(cacheKey)}"
        data-candidates="${this.escapeHtml(candidateListAttr)}"
        data-candidate-index="0"
        data-initials="${this.escapeHtml(initials)}"
      >
        ${
          primaryUrl
            ? `<img 
                src="${this.escapeHtml(primaryUrl)}" 
                alt="${this.escapeHtml(serviceName)}" 
                class="dashpark-icon-img" 
                loading="lazy" 
                onload="window.__dashParkIconLoaded && window.__dashParkIconLoaded(this)"
                onerror="window.__dashParkIconError && window.__dashParkIconError(this)" 
              />
              <div class="dashpark-icon-fallback" style="display:none;">
                <span class="dashpark-icon-vector" style="display:none;">${lucideSvg}</span>
                <span class="dashpark-icon-initials" style="display:none;">${initials}</span>
              </div>`
            : `<div class="dashpark-icon-fallback">
                <span class="dashpark-icon-vector">${lucideSvg}</span>
              </div>`
        }
      </div>
    `;
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

export const globalIconResolver = new IconResolver();
