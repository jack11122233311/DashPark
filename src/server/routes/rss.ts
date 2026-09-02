import type { FastifyPluginAsync } from 'fastify';

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  snippet?: string;
  author?: string;
}

interface FeedCacheEntry {
  title: string;
  description?: string;
  link?: string;
  items: RssItem[];
  cachedAt: number;
}

const feedCache = new Map<string, FeedCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssOrAtom(xmlText: string): { title: string; description?: string; link?: string; items: RssItem[] } {
  // Extract channel title / feed title
  const channelTitleMatch = xmlText.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
  const channelTitle = channelTitleMatch ? stripHtml(channelTitleMatch[1]) : 'RSS Feed';

  const items: RssItem[] = [];

  // 1. Try RSS 2.0 <item> tags
  const itemMatches = xmlText.match(/<item[\s>].*?<\/item>/gis);
  if (itemMatches && itemMatches.length > 0) {
    for (const itemXml of itemMatches.slice(0, 20)) {
      const titleM = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is);
      const linkM = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/is);
      const descM = itemXml.match(/<(?:description|content:encoded)[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:description|content:encoded)>/is);
      const dateM = itemXml.match(/<(?:pubDate|dc:date)[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:pubDate|dc:date)>/is);
      const authorM = itemXml.match(/<(?:author|dc:creator)[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:author|dc:creator)>/is);

      const title = titleM ? stripHtml(titleM[1]) : 'Untitled Article';
      const link = linkM ? stripHtml(linkM[1]) : '';
      const snippet = descM ? stripHtml(descM[1]).slice(0, 220) : undefined;
      const pubDate = dateM ? stripHtml(dateM[1]) : undefined;
      const author = authorM ? stripHtml(authorM[1]) : undefined;

      if (title && link) {
        items.push({ title, link, pubDate, snippet, author });
      }
    }
  } else {
    // 2. Try Atom <entry> tags
    const entryMatches = xmlText.match(/<entry[\s>].*?<\/entry>/gis);
    if (entryMatches && entryMatches.length > 0) {
      for (const entryXml of entryMatches.slice(0, 20)) {
        const titleM = entryXml.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is);
        const linkHrefM = entryXml.match(/<link[^>]+href=["']([^"']+)["']/is) || entryXml.match(/<link[^>]*>(.*?)<\/link>/is);
        const summaryM = entryXml.match(/<(?:summary|content)[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:summary|content)>/is);
        const dateM = entryXml.match(/<(?:published|updated)[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:published|updated)>/is);
        const authorM = entryXml.match(/<name[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/is);

        const title = titleM ? stripHtml(titleM[1]) : 'Untitled Entry';
        const link = linkHrefM ? stripHtml(linkHrefM[1]) : '';
        const snippet = summaryM ? stripHtml(summaryM[1]).slice(0, 220) : undefined;
        const pubDate = dateM ? stripHtml(dateM[1]) : undefined;
        const author = authorM ? stripHtml(authorM[1]) : undefined;

        if (title && link) {
          items.push({ title, link, pubDate, snippet, author });
        }
      }
    }
  }

  return {
    title: channelTitle,
    items,
  };
}

export const rssRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { url?: string } }>('/api/v1/rss', async (req, reply) => {
    const feedUrl = req.query.url?.trim();

    if (!feedUrl) {
      return reply.status(400).send({
        error: 'Missing required "url" parameter',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      new URL(feedUrl);
    } catch {
      return reply.status(400).send({
        error: 'Invalid "url" parameter: Must be a valid absolute HTTP(S) URL',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    const cached = feedCache.get(feedUrl);
    const now = Date.now();
    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      return reply.send({
        success: true,
        title: cached.title,
        description: cached.description,
        link: cached.link,
        items: cached.items,
        cachedAt: new Date(cached.cachedAt).toISOString(),
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DashPark-NewsReader/0.9.0 (RSS Aggregator; +https://github.com/jack11122233311/DashPark)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return reply.status(502).send({
          error: `Upstream feed returned HTTP ${response.status}`,
          statusCode: 502,
          timestamp: new Date().toISOString(),
        });
      }

      const xmlText = await response.text();
      const parsed = parseRssOrAtom(xmlText);

      feedCache.set(feedUrl, {
        title: parsed.title,
        description: parsed.description,
        link: parsed.link,
        items: parsed.items,
        cachedAt: now,
      });

      return reply.send({
        success: true,
        title: parsed.title,
        description: parsed.description,
        link: parsed.link,
        items: parsed.items,
        cachedAt: new Date(now).toISOString(),
      });
    } catch (err: unknown) {
      const isAbort = (err as Error)?.name === 'AbortError';
      return reply.status(504).send({
        error: isAbort ? 'Feed request timed out (>6s)' : (err as Error)?.message || 'Failed to fetch RSS feed',
        statusCode: 504,
        timestamp: new Date().toISOString(),
      });
    }
  });
};
