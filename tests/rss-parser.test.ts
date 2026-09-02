import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { rssRoutes } from '../src/server/routes/rss.js';

describe('RSS / News Feed Proxy & Parser', () => {
  it('validates missing or invalid url query parameters', async () => {
    const fastify = Fastify();
    await fastify.register(rssRoutes);

    const res1 = await fastify.inject({
      method: 'GET',
      url: '/api/v1/rss',
    });
    expect(res1.statusCode).toBe(400);
    const json1 = JSON.parse(res1.payload);
    expect(json1.error).toContain('Missing required "url" parameter');

    const res2 = await fastify.inject({
      method: 'GET',
      url: '/api/v1/rss?url=invalid-url-string',
    });
    expect(res2.statusCode).toBe(400);
    const json2 = JSON.parse(res2.payload);
    expect(json2.error).toContain('Must be a valid absolute HTTP(S) URL');
  });
});
