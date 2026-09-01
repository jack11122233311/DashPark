import type { FastifyPluginAsync } from 'fastify';
import { APP_VERSION } from '../../shared/version.js';

interface CacheEntry {
  data: any;
  value: any;
  cachedAt: number;
  statusCode: number;
}

const widgetCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 15000; // 15s cache

/**
 * Extracts a value from a nested JSON object using dot notation path (e.g. "data.streams.count" or "ads_blocked_today")
 */
export function extractJsonPath(obj: any, pathStr?: string): any {
  if (!pathStr || !pathStr.trim()) return obj;
  const parts = pathStr.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
  
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export const widgetRoutes: FastifyPluginAsync = async (fastify) => {
  // Proxy endpoint with caching for live frontend widgets
  fastify.get<{
    Querystring: {
      url: string;
      jsonPath?: string;
      headers?: string; // JSON encoded headers
    };
  }>('/api/v1/widgets/proxy', async (req, reply) => {
    const { url, jsonPath, headers: rawHeaders } = req.query;

    if (!url || !url.startsWith('http')) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid target URL parameter',
      });
    }

    const cacheKey = `${url}::${jsonPath || ''}`;
    const now = Date.now();
    const cached = widgetCache.get(cacheKey);

    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      return reply.send({
        success: true,
        value: cached.value,
        raw: cached.data,
        cached: true,
        statusCode: cached.statusCode,
      });
    }

    let parsedHeaders: Record<string, string> = {
      'User-Agent': `DashPark-WidgetProxy/${APP_VERSION}`,
      Accept: 'application/json, text/plain, */*',
    };

    if (rawHeaders) {
      try {
        parsedHeaders = { ...parsedHeaders, ...JSON.parse(rawHeaders) };
      } catch {
        // Ignore invalid headers JSON
      }
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'GET',
        headers: parsedHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok && response.status !== 401 && response.status !== 403) {
        return reply.status(response.status).send({
          success: false,
          error: `Endpoint returned HTTP ${response.status}`,
          statusCode: response.status,
          latencyMs,
        });
      }

      let data: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      const extractedValue = extractJsonPath(data, jsonPath);

      widgetCache.set(cacheKey, {
        data,
        value: extractedValue,
        cachedAt: now,
        statusCode: response.status,
      });

      return reply.send({
        success: true,
        value: extractedValue,
        raw: data,
        cached: false,
        latencyMs,
        statusCode: response.status,
      });
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const isAbort = (err as Error)?.name === 'AbortError';

      return reply.status(502).send({
        success: false,
        error: isAbort ? 'Widget request timed out (>4s)' : (err as Error)?.message || 'Proxy fetch failed',
        latencyMs,
      });
    }
  });

  // On-demand test endpoint for in-app configuration editor
  fastify.post<{
    Body: {
      url: string;
      headers?: Record<string, string>;
      jsonPath?: string;
    };
  }>('/api/v1/widgets/test', async (req, reply) => {
    const { url, headers, jsonPath } = req.body || {};

    if (!url || !url.startsWith('http')) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid URL. Must begin with http:// or https://',
      });
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const requestHeaders: Record<string, string> = {
        'User-Agent': `DashPark-WidgetProxy/${APP_VERSION}`,
        Accept: 'application/json, text/plain, */*',
        ...(headers || {}),
      };

      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      let data: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      const extractedValue = extractJsonPath(data, jsonPath);

      return reply.send({
        success: response.ok,
        statusCode: response.status,
        latencyMs,
        extractedValue,
        rawJson: data,
      });
    } catch (err: unknown) {
      const isAbort = (err as Error)?.name === 'AbortError';
      return reply.send({
        success: false,
        error: isAbort ? 'Request timed out (>4s)' : (err as Error)?.message || 'Connection failed',
      });
    }
  });
};
