/**
 * Shared Type Definitions for DashPark v0.0.1
 */

export type ThemeName = 'dark' | 'light' | 'nord' | 'dracula' | 'cyberpunk' | 'catppuccin' | 'glass';
export type LayoutMode = 'grid' | 'bento' | 'compact';
export type ServiceTarget = '_blank' | '_self';
export type HealthStatus = 'online' | 'degraded' | 'offline' | 'disabled' | 'pending';

export interface DashboardMeta {
  title: string;
  subtitle?: string;
  logo?: string;
  theme: ThemeName;
  accentColor?: string;
  backgroundUrl?: string;
  glassBlur?: number;
  glassOpacity?: number;
  layout: LayoutMode;
  showClock: boolean;
  clockFormat?: '12h' | '24h';
  showSeconds?: boolean;
  showDate?: boolean;
  searchEngine?: {
    enabled: boolean;
    provider?: 'duckduckgo' | 'google' | 'brave' | 'searxng' | 'custom';
    customUrl?: string;
  };
}

export type WidgetType = 'stat' | 'sparkline' | 'chart' | 'badge';

export interface ServiceShortcut {
  name: string;
  url: string;
  icon?: string;
  target?: ServiceTarget;
}

export interface ServiceWidget {
  enabled?: boolean;
  type: WidgetType;
  url?: string;
  headers?: Record<string, string>;
  jsonPath?: string;
  label?: string;
  unit?: string;
  showGraph?: boolean;
  refreshIntervalSeconds?: number;
}

export type BentoTileSpan = '1x1' | '2x1' | '1x2' | '2x2';

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
  shortcuts?: ServiceShortcut[];
  bentoSpan?: BentoTileSpan;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  columns?: number;
  collapsed?: boolean;
  services: ServiceItem[];
}

export interface DashboardPage {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  categories: Category[];
}

export interface DashParkConfig {
  version: string;
  meta: DashboardMeta;
  categories?: Category[];
  pages?: DashboardPage[];
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
