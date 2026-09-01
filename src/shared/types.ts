/**
 * Shared Type Definitions for DashPark v0.0.1
 */

export type ThemeName = 'dark' | 'light' | 'nord' | 'dracula' | 'cyberpunk' | 'glass';
export type LayoutMode = 'grid' | 'bento' | 'compact';
export type ServiceTarget = '_blank' | '_self';
export type HealthStatus = 'online' | 'degraded' | 'offline' | 'disabled' | 'pending';

export interface DashboardMeta {
  title: string;
  subtitle?: string;
  logo?: string;
  theme: ThemeName;
  accentColor?: string;
  layout: LayoutMode;
  showClock: boolean;
  clockFormat?: '12h' | '24h';
  searchEngine?: {
    enabled: boolean;
    provider?: 'duckduckgo' | 'google' | 'brave' | 'custom';
    customUrl?: string;
  };
}

export type WidgetType = 'stat' | 'sparkline' | 'chart' | 'badge';

export interface ServiceWidget {
  type: WidgetType;
  url?: string;
  headers?: Record<string, string>;
  jsonPath?: string;
  label?: string;
  unit?: string;
  refreshIntervalSeconds?: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  pingUrl?: string;
  target?: ServiceTarget;
  tags?: string[];
  status?: HealthStatus;
  latencyMs?: number;
  widget?: ServiceWidget;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  columns?: number;
  collapsed?: boolean;
  services: ServiceItem[];
}

export interface DashParkConfig {
  version: string;
  meta: DashboardMeta;
  categories: Category[];
}

export interface ErrorDiagnostic {
  line: number;
  column: number;
  message: string;
  snippet?: string;
  severity: 'error' | 'warning';
}

export interface ConfigResponse {
  valid: boolean;
  source: 'file' | 'sample' | 'fallback';
  filePath?: string;
  lastLoadedAt: string;
  config?: DashParkConfig;
  diagnostics?: ErrorDiagnostic[];
  rawYaml?: string;
}

export interface ServerHealthResponse {
  status: 'ok';
  version: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  timestamp: string;
}
