import { z } from 'zod';

export const ThemeNameSchema = z.enum(['dark', 'light', 'nord', 'dracula', 'cyberpunk', 'glass']).default('dark');
export const LayoutModeSchema = z.enum(['grid', 'bento', 'compact']).default('grid');
export const ServiceTargetSchema = z.enum(['_blank', '_self']).default('_blank');

export const DashboardMetaSchema = z.object({
  title: z.string().min(1, 'Dashboard title cannot be empty').default('DashPark'),
  subtitle: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  theme: ThemeNameSchema,
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color code (e.g. #6366f1)').optional().default('#6366f1'),
  layout: LayoutModeSchema,
  showClock: z.boolean().default(true),
  clockFormat: z.enum(['12h', '24h']).default('24h'),
  searchEngine: z.object({
    enabled: z.boolean().default(true),
    provider: z.enum(['duckduckgo', 'google', 'brave', 'custom']).default('duckduckgo'),
    customUrl: z.string().optional().default(''),
  }).optional().default({ enabled: true, provider: 'duckduckgo', customUrl: '' }),
}).default({
  title: 'DashPark',
  subtitle: '',
  logo: '',
  theme: 'dark',
  accentColor: '#6366f1',
  layout: 'grid',
  showClock: true,
  clockFormat: '24h',
  searchEngine: { enabled: true, provider: 'duckduckgo', customUrl: '' },
});

export const ServiceShortcutSchema = z.object({
  name: z.string().min(1, 'Shortcut name is required'),
  url: z.string().min(1, 'Shortcut URL is required'),
  icon: z.string().optional().default(''),
  target: ServiceTargetSchema.optional().default('_blank'),
});

export const ServiceWidgetSchema = z.object({
  enabled: z.boolean().optional().default(true),
  type: z.enum(['stat', 'sparkline', 'chart', 'badge']).default('stat'),
  url: z.string().optional().default(''),
  headers: z.record(z.string()).optional(),
  jsonPath: z.string().optional().default(''),
  label: z.string().optional().default(''),
  unit: z.string().optional().default(''),
  showGraph: z.boolean().optional().default(true),
  refreshIntervalSeconds: z.number().int().min(5).max(3600).optional().default(30),
}).optional();

export const ServiceItemSchema = z.object({
  id: z.string().min(1, 'Service ID is required'),
  name: z.string().min(1, 'Service name is required'),
  url: z.string().url('Service URL must be a valid absolute URL (e.g. http://192.168.1.50:8080 or https://plex.local)'),
  icon: z.string().optional().default(''),
  description: z.string().optional().default(''),
  pingUrl: z.string().url('Ping URL must be a valid URL').optional().or(z.literal('')),
  target: ServiceTargetSchema,
  tags: z.array(z.string()).optional().default([]),
  widget: ServiceWidgetSchema,
  shortcuts: z.array(ServiceShortcutSchema).optional().default([]),
  bentoSpan: z.enum(['1x1', '2x1', '1x2', '2x2']).optional().default('1x1'),
});

export const CategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Category name is required'),
  icon: z.string().optional().default('folder'),
  columns: z.number().int().min(1).max(12).optional().default(4),
  collapsed: z.boolean().optional().default(false),
  services: z.array(ServiceItemSchema).default([]),
});

export const DashboardPageSchema = z.object({
  id: z.string().min(1, 'Page ID is required'),
  name: z.string().min(1, 'Page name is required'),
  icon: z.string().optional().default('home'),
  description: z.string().optional().default(''),
  categories: z.array(CategorySchema).default([]),
});

export const DashParkConfigSchema = z.object({
  version: z.string().default('0.3.0'),
  meta: DashboardMetaSchema,
  categories: z.array(CategorySchema).optional(),
  pages: z.array(DashboardPageSchema).optional(),
}).transform((cfg) => {
  if (cfg.pages && cfg.pages.length > 0) {
    const allCategories = cfg.pages.flatMap((p) => p.categories);
    return {
      ...cfg,
      categories: allCategories,
      pages: cfg.pages,
    };
  }
  const rootCategories = cfg.categories || [];
  return {
    ...cfg,
    categories: rootCategories,
    pages: [
      {
        id: 'home',
        name: 'Home',
        icon: 'home',
        description: 'Default dashboard overview',
        categories: rootCategories,
      },
    ],
  };
});

export type ParsedConfig = z.infer<typeof DashParkConfigSchema>;
