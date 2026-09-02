import type { ServiceItem, HealthStatus } from '../../shared/types.js';
import { globalIconResolver } from '../icons/IconResolver.js';

export interface ServiceHealthView {
  status: HealthStatus;
  latencyMs: number;
}

export interface ServiceWidgetView {
  value: string | number;
  label?: string;
  unit?: string;
}

export class DomRenderer {
  public static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public static computeCategoryHealthRollup(
    services: ServiceItem[],
    healthMap: Map<string, ServiceHealthView>
  ): { cssClass: string; text: string } {
    const total = services.length;
    let online = 0;
    let degraded = 0;
    let offline = 0;

    services.forEach((s) => {
      const h = healthMap.get(s.id);
      if (h?.status === 'online') online++;
      else if (h?.status === 'degraded') degraded++;
      else if (h?.status === 'offline') offline++;
    });

    if (offline > 0) {
      return { cssClass: 'has-offline', text: `🔴 ${offline} Offline` };
    }
    if (degraded > 0) {
      return { cssClass: 'has-degraded', text: `🟡 ${degraded} Degraded` };
    }
    return { cssClass: 'all-online', text: `🟢 ${online}/${total}` };
  }

  public static renderStandardCard(
    svc: ServiceItem,
    categoryIcon?: string,
    health?: ServiceHealthView,
    widget?: ServiceWidgetView
  ): string {
    const status = health?.status || 'pending';
    const latencyStr = health ? `${health.latencyMs}ms` : 'Ping';
    const showGraph = svc.widget?.enabled !== false && svc.widget?.showGraph !== false;

    const iconHtml = globalIconResolver.renderIcon({
      serviceName: svc.name,
      iconIdentifier: svc.icon,
      serviceUrl: svc.url,
      categoryIcon,
      size: 44,
    });

    const tagsHtml = (svc.tags || [])
      .slice(0, 2)
      .map((t) => `<span class="card-tag">#${this.escapeHtml(t)}</span>`)
      .join('');

    const shortcutsHtml = (svc.shortcuts || []).length > 0
      ? `<div class="service-shortcuts-row">
          ${svc.shortcuts!
            .map(
              (sc) =>
                `<span class="service-shortcut-chip" onclick="window.__dashParkOpenShortcut(event, '${this.escapeHtml(sc.url)}', '${sc.target || '_blank'}')">${this.escapeHtml(sc.name)}</span>`
            )
            .join('')}
        </div>`
      : '';

    return `
      <a 
        href="${this.escapeHtml(svc.url)}" 
        target="${svc.target || '_blank'}" 
        rel="noopener noreferrer"
        class="service-card" 
        data-service-id="${svc.id}"
        data-service-name="${this.escapeHtml(svc.name.toLowerCase())}"
        data-service-desc="${this.escapeHtml((svc.description || '').toLowerCase())}"
        data-service-tags="${this.escapeHtml((svc.tags || []).join(' ').toLowerCase())}"
      >
        ${iconHtml}
        <div class="service-content">
          <div class="service-header-row">
            <h3 class="service-name">${this.escapeHtml(svc.name)}</h3>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              ${showGraph ? `<div class="service-sparkline-box grid-sparkline-slot" data-sparkline="${svc.id}"></div>` : ''}
              <span class="service-latency-badge ${status}" data-health-badge="${svc.id}">${latencyStr}</span>
            </div>
          </div>
          ${svc.description ? `<p class="service-desc">${this.escapeHtml(svc.description)}</p>` : ''}
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.4rem;">
            ${tagsHtml ? `<div class="service-tags-row" style="margin-top: 0;">${tagsHtml}</div>` : '<div></div>'}
            <span 
              class="service-widget-badge" 
              data-widget-badge="${svc.id}" 
              style="${widget ? 'display: inline-flex;' : 'display: none;'}"
            >
              ${widget ? `${widget.label ? widget.label + ': ' : ''}${widget.value}${widget.unit || ''}` : ''}
            </span>
          </div>
          ${shortcutsHtml}
        </div>
      </a>
    `;
  }

  public static renderBentoCard(
    service: ServiceItem,
    categoryName: string,
    categoryIcon?: string,
    health?: ServiceHealthView,
    widget?: ServiceWidgetView,
    isEditMode: boolean = false
  ): string {
    const status = health?.status || 'pending';
    const latencyStr = health ? `${health.latencyMs}ms` : 'Ping';
    const showGraph = service.widget?.enabled !== false && service.widget?.showGraph !== false;
    const spanClass = `span-${service.bentoSpan || '1x1'}`;
    const isHero = service.bentoSpan === '2x1' || service.bentoSpan === '2x2';

    const iconHtml = globalIconResolver.renderIcon({
      serviceName: service.name,
      iconIdentifier: service.icon,
      serviceUrl: service.url,
      categoryIcon,
      size: isHero ? 50 : 44,
    });

    const shortcutsHtml = (service.shortcuts || []).length > 0
      ? `<div class="service-shortcuts-row">
          ${service.shortcuts!
            .map(
              (sc) =>
                `<span class="service-shortcut-chip" onclick="window.__dashParkOpenShortcut(event, '${this.escapeHtml(sc.url)}', '${sc.target || '_blank'}')">${this.escapeHtml(sc.name)}</span>`
            )
            .join('')}
        </div>`
      : '';

    const editToolbarHtml = isEditMode
      ? `<div class="bento-tile-toolbar">
          <button type="button" class="bento-tile-btn" onclick="window.__dashParkCycleTileSpan(event, '${service.id}')" title="Cycle tile size">
            📐 ${service.bentoSpan || '1x1'}
          </button>
          <button type="button" class="bento-tile-btn" onclick="window.__dashParkCycleTelemetry(event, '${service.id}')" title="Toggle graph/stat display">
            📊 ${showGraph ? 'Graph' : service.widget?.enabled !== false ? 'Stat' : 'Off'}
          </button>
        </div>`
      : '';

    return `
      <a 
        href="${isEditMode ? 'javascript:void(0)' : this.escapeHtml(service.url)}" 
        target="${service.target || '_blank'}" 
        rel="noopener noreferrer"
        class="bento-card ${spanClass}"
        data-service-id="${service.id}"
        data-service-name="${this.escapeHtml(service.name.toLowerCase())}"
        data-service-desc="${this.escapeHtml((service.description || '').toLowerCase())}"
        data-service-tags="${this.escapeHtml((service.tags || []).join(' ').toLowerCase())}"
      >
        ${editToolbarHtml}
        <div class="bento-top-row">
          ${iconHtml}
          <div class="bento-meta">
            ${showGraph ? `<div class="service-sparkline-box bento-telemetry-slot" data-sparkline="${service.id}"></div>` : ''}
            <span class="service-latency-badge ${status}" data-health-badge="${service.id}">${latencyStr}</span>
            <span class="bento-category-badge">${this.escapeHtml(categoryName)}</span>
            <span class="service-status-dot ${status}" data-status-dot="${service.id}"></span>
          </div>
        </div>
        <div class="bento-bottom-row">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <h3 class="bento-title">${this.escapeHtml(service.name)}</h3>
            <span 
              class="service-widget-badge" 
              data-widget-badge="${service.id}" 
              style="${widget ? 'display: inline-flex;' : 'display: none;'}"
            >
              ${widget ? `${widget.label ? widget.label + ': ' : ''}${widget.value}${widget.unit || ''}` : ''}
            </span>
          </div>
          ${service.description ? `<p class="bento-desc">${this.escapeHtml(service.description)}</p>` : ''}
          ${shortcutsHtml}
        </div>
      </a>
    `;
  }

  public static renderCompactRow(
    service: ServiceItem,
    categoryName: string,
    categoryIcon?: string,
    health?: ServiceHealthView,
    widget?: ServiceWidgetView
  ): string {
    const status = health?.status || 'pending';
    const latencyStr = health ? `${health.latencyMs}ms` : '---';

    const iconHtml = globalIconResolver.renderIcon({
      serviceName: service.name,
      iconIdentifier: service.icon,
      serviceUrl: service.url,
      categoryIcon,
      size: 28,
    });

    const shortcutsInline = (service.shortcuts || [])
      .map(
        (sc) =>
          `<span class="service-shortcut-chip" style="padding: 0.1rem 0.35rem; font-size: 0.625rem;" onclick="window.__dashParkOpenShortcut(event, '${this.escapeHtml(sc.url)}', '${sc.target || '_blank'}')">${this.escapeHtml(sc.name)}</span>`
      )
      .join('');

    return `
      <tr 
        class="compact-row"
        onclick="window.open('${this.escapeHtml(service.url)}', '${service.target || '_blank'}')"
        data-service-id="${service.id}"
        data-service-name="${this.escapeHtml(service.name.toLowerCase())}"
        data-service-desc="${this.escapeHtml((service.description || '').toLowerCase())}"
        data-service-tags="${this.escapeHtml((service.tags || []).join(' ').toLowerCase())}"
      >
        <td>
          <div class="compact-name-cell">
            ${iconHtml}
            <span>${this.escapeHtml(service.name)}</span>
          </div>
        </td>
        <td>
          <span class="bento-category-badge">${this.escapeHtml(categoryName)}</span>
        </td>
        <td>
          <a href="${this.escapeHtml(service.url)}" class="compact-url-link" onclick="event.stopPropagation();" target="_blank">
            ${this.escapeHtml(service.url)}
          </a>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; align-items: center; gap: 0.4rem; justify-content: flex-end; flex-wrap: wrap;">
            ${shortcutsInline}
            <span 
              class="service-widget-badge" 
              data-widget-badge="${service.id}" 
              style="${widget ? 'display: inline-flex;' : 'display: none;'}"
            >
              ${widget ? `${widget.label ? widget.label + ': ' : ''}${widget.value}${widget.unit || ''}` : ''}
            </span>
            <span class="service-latency-badge ${status}" data-health-badge="${service.id}">
              <span class="service-status-dot ${status}" data-status-dot="${service.id}" style="width: 5px; height: 5px;"></span>
              ${latencyStr}
            </span>
          </div>
        </td>
      </tr>
    `;
  }
}
