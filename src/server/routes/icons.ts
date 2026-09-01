import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';

interface FaviconCacheEntry {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}

// In-memory cache for fetched favicons (1 hour TTL)
const faviconCache = new Map<string, FaviconCacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export const iconRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Ensure local icons directory exists
  const iconsDir = path.resolve(process.cwd(), 'icons');
  if (!fs.existsSync(iconsDir)) {
    try {
      fs.mkdirSync(iconsDir, { recursive: true });
    } catch (e) {
      console.warn('[DashPark] Failed to create icons directory:', e);
    }
  }

  // Serve custom local icons at /icons/*
  await fastify.register(fastifyStatic, {
    root: iconsDir,
    prefix: '/icons/',
    decorateReply: false,
  });

  // Backend Favicon Proxy with timeout protection and caching
  fastify.get<{ Querystring: { domain?: string; url?: string } }>(
    '/api/v1/icons/favicon',
    async (req, reply) => {
      let domain = req.query.domain;
      const urlParam = req.query.url;

      if (!domain && urlParam) {
        try {
          domain = new URL(urlParam).hostname;
        } catch {
          domain = undefined;
        }
      }

      if (!domain || typeof domain !== 'string') {
        return reply.status(400).send({ error: 'Missing or invalid "domain" or "url" query parameter' });
      }

      // Sanitize domain
      domain = domain.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');

      // Check in-memory cache
      const cached = faviconCache.get(domain);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return reply
          .header('Content-Type', cached.contentType)
          .header('Cache-Control', 'public, max-age=86400')
          .send(cached.buffer);
      }

      // Sources to try: DuckDuckGo favicon API then Google Favicon API
      const fallbackUrls = [
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      ];

      for (const faviconUrl of fallbackUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const response = await fetch(faviconUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DashPark/0.0.1',
            },
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const contentType = response.headers.get('content-type') || 'image/x-icon';
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Save to cache
            faviconCache.set(domain, {
              buffer,
              contentType,
              timestamp: Date.now(),
            });

            return reply
              .header('Content-Type', contentType)
              .header('Cache-Control', 'public, max-age=86400')
              .send(buffer);
          }
        } catch {
          // Continue to next fallback source
        }
      }

      return reply.status(404).send({ error: 'Favicon not found for domain', domain });
    }
  );
};
