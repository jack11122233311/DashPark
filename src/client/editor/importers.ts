import { parse as parseYaml } from 'yaml';
import type { Category, ServiceItem, DashboardPage } from '../../shared/types.js';

export interface ImportResult {
  success: boolean;
  detectedFormat: 'homepage' | 'homarr' | 'dashy' | 'heimdall' | 'unknown';
  pages: DashboardPage[];
  categories: Category[];
  totalServices: number;
  error?: string;
}

export function detectAndImportConfig(content: string): ImportResult {
  const trimmed = content.trim();

  // Try parsing as JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);

      // Check Heimdall: { apps: [ { title, url } ] } or [ { title, url } ]
      if (json.apps && Array.isArray(json.apps) && json.apps.some((x: any) => x.title && !x.category)) {
        return importHeimdall(json);
      }
      if (Array.isArray(json) && json.some((x: any) => x.title && !x.name && !x.category)) {
        return importHeimdall(json);
      }

      // Check Homarr: wrappers, gridItems, items, or apps with category/name
      if (json.wrappers || json.items || (json.apps && Array.isArray(json.apps)) || (Array.isArray(json) && json.some((x) => x.name && x.url))) {
        return importHomarr(json);
      }
    } catch {
      // Fallback to YAML
    }
  }

  // Try parsing as YAML
  try {
    const parsed = parseYaml(trimmed);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, detectedFormat: 'unknown', pages: [], categories: [], totalServices: 0, error: 'Invalid YAML or JSON file' };
    }

    // Check Dashy: sections
    if (parsed.sections && Array.isArray(parsed.sections)) {
      return importDashy(parsed);
    }

    // Check Homepage: array of groups
    if (Array.isArray(parsed)) {
      return importHomepage(parsed);
    }

    // If it's a DashPark config itself
    if (parsed.pages || parsed.categories) {
      const cats: Category[] = parsed.pages ? parsed.pages.flatMap((p: any) => p.categories || []) : parsed.categories || [];
      const totalServices = cats.reduce((acc, c) => acc + (c.services?.length || 0), 0);
      return {
        success: true,
        detectedFormat: 'unknown',
        pages: parsed.pages || [{ id: 'home', name: 'Home', categories: cats }],
        categories: cats,
        totalServices,
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      detectedFormat: 'unknown',
      pages: [],
      categories: [],
      totalServices: 0,
      error: (err as Error)?.message || 'Failed to parse configuration',
    };
  }

  return { success: false, detectedFormat: 'unknown', pages: [], categories: [], totalServices: 0, error: 'Unrecognized dashboard configuration format' };
}

/**
 * 1. Homepage Importer (services.yaml)
 */
export function importHomepage(yamlArray: any[]): ImportResult {
  const categories: Category[] = [];

  yamlArray.forEach((groupObj, groupIdx) => {
    if (typeof groupObj !== 'object' || !groupObj) return;

    Object.entries(groupObj).forEach(([groupName, items]) => {
      const catId = groupName.toLowerCase().replace(/[^a-z0-9]/g, '') || `cat_${groupIdx}`;
      const services: ServiceItem[] = [];

      if (Array.isArray(items)) {
        items.forEach((itemObj) => {
          if (typeof itemObj !== 'object') return;
          Object.entries(itemObj).forEach(([svcName, meta]: [string, any]) => {
            const cleanMeta = meta || {};
            const cleanId = svcName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const rawIcon = cleanMeta.icon ? cleanMeta.icon.replace(/\.[a-z]+$/i, '') : cleanId;

            services.push({
              id: cleanId || `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: svcName,
              url: cleanMeta.href || 'http://localhost',
              icon: rawIcon,
              description: cleanMeta.description || '',
              pingUrl: cleanMeta.ping || cleanMeta.href || '',
              target: '_blank',
              tags: [groupName.toLowerCase()],
              bentoSpan: '1x1',
              widget: cleanMeta.widget
                ? {
                    enabled: true,
                    type: 'stat',
                    url: cleanMeta.widget.url,
                    jsonPath: cleanMeta.widget.key,
                  }
                : undefined,
            });
          });
        });
      }

      categories.push({
        id: catId,
        name: groupName,
        icon: 'folder',
        columns: 4,
        services,
      });
    });
  });

  const totalServices = categories.reduce((sum, c) => sum + c.services.length, 0);

  return {
    success: true,
    detectedFormat: 'homepage',
    pages: [{ id: 'home', name: 'Homepage Import', icon: 'home', categories }],
    categories,
    totalServices,
  };
}

/**
 * 2. Dashy Importer (conf.yml)
 */
export function importDashy(dashyObj: any): ImportResult {
  const categories: Category[] = [];
  const sections = Array.isArray(dashyObj.sections) ? dashyObj.sections : [];

  sections.forEach((sec: any, secIdx: number) => {
    const name = sec.name || `Section ${secIdx + 1}`;
    const catId = name.toLowerCase().replace(/[^a-z0-9]/g, '') || `cat_${secIdx}`;
    const services: ServiceItem[] = [];

    const items = Array.isArray(sec.items) ? sec.items : [];
    items.forEach((item: any) => {
      const cleanName = item.title || item.name || 'Service';
      const cleanId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rawIcon = (item.icon || '').replace(/^hl-/, '').replace(/\.[a-z]+$/i, '');

      services.push({
        id: cleanId || `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        url: item.url || item.href || 'http://localhost',
        icon: rawIcon || cleanId,
        description: item.description || '',
        pingUrl: item.target || item.url || '',
        target: item.target === '_self' ? '_self' : '_blank',
        tags: [name.toLowerCase()],
        bentoSpan: '1x1',
      });
    });

    categories.push({
      id: catId,
      name,
      icon: sec.icon ? sec.icon.replace(/^hl-/, '') : 'folder',
      columns: 4,
      services,
    });
  });

  const totalServices = categories.reduce((sum, c) => sum + c.services.length, 0);

  return {
    success: true,
    detectedFormat: 'dashy',
    pages: [{ id: 'home', name: 'Dashy Import', icon: 'home', categories }],
    categories,
    totalServices,
  };
}

/**
 * 3. Homarr Importer (JSON)
 */
export function importHomarr(homarrObj: any): ImportResult {
  const categories: Category[] = [];
  let rawItems: any[] = [];

  if (Array.isArray(homarrObj)) {
    rawItems = homarrObj;
  } else if (homarrObj.wrappers && Array.isArray(homarrObj.wrappers)) {
    homarrObj.wrappers.forEach((w: any) => {
      (w.gridItems || []).forEach((gi: any) => {
        if (gi.item) rawItems.push(gi.item);
        else if (gi.app) rawItems.push(gi.app);
      });
    });
  } else {
    rawItems = homarrObj.items || homarrObj.apps || [];
  }

  const categoryMap = new Map<string, ServiceItem[]>();

  rawItems.forEach((item: any) => {
    const catName = item.category || 'Default';
    const cleanName = item.name || item.title || 'App';
    const cleanId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const service: ServiceItem = {
      id: cleanId || `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      url: item.url || item.href || 'http://localhost',
      icon: (item.icon || '').replace(/\.[a-z]+$/i, '') || cleanId,
      description: item.description || '',
      pingUrl: item.pingUrl || item.url || '',
      target: '_blank',
      tags: [catName.toLowerCase()],
      bentoSpan: '1x1',
    };

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, []);
    }
    categoryMap.get(catName)!.push(service);
  });

  categoryMap.forEach((services, name) => {
    categories.push({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'general',
      name,
      icon: 'folder',
      columns: 4,
      services,
    });
  });

  const totalServices = categories.reduce((sum, c) => sum + c.services.length, 0);

  return {
    success: true,
    detectedFormat: 'homarr',
    pages: [{ id: 'home', name: 'Homarr Import', icon: 'home', categories }],
    categories,
    totalServices,
  };
}

/**
 * 4. Heimdall Importer (JSON)
 */
export function importHeimdall(heimdallObj: any): ImportResult {
  const rawApps = Array.isArray(heimdallObj) ? heimdallObj : heimdallObj.apps || [];
  const services: ServiceItem[] = [];

  rawApps.forEach((app: any) => {
    const cleanName = app.title || app.name || 'App';
    const cleanId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

    services.push({
      id: cleanId || `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      url: app.url || 'http://localhost',
      icon: (app.icon || '').replace(/\.[a-z]+$/i, '') || cleanId,
      description: app.description || '',
      pingUrl: app.url || '',
      target: '_blank',
      tags: ['heimdall'],
      bentoSpan: '1x1',
    });
  });

  const categories: Category[] = [
    {
      id: 'heimdall_apps',
      name: 'Heimdall Apps',
      icon: 'folder',
      columns: 4,
      services,
    },
  ];

  return {
    success: true,
    detectedFormat: 'heimdall',
    pages: [{ id: 'home', name: 'Heimdall Import', icon: 'home', categories }],
    categories,
    totalServices: services.length,
  };
}
