import type { FastifyPluginAsync } from 'fastify';
import { globalWeatherService } from '../services/weather.js';

export const weatherRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { lat?: string; lon?: string; units?: 'celsius' | 'fahrenheit'; city?: string } }>(
    '/api/v1/weather',
    async (req, reply) => {
      const lat = req.query.lat ? parseFloat(req.query.lat) : 51.5074;
      const lon = req.query.lon ? parseFloat(req.query.lon) : -0.1278;
      const units = req.query.units === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const city = req.query.city;

      try {
        const weather = await globalWeatherService.getWeather(lat, lon, units, city);
        return reply.status(200).send({
          success: true,
          weather,
        });
      } catch (err: unknown) {
        return reply.status(502).send({
          success: false,
          error: (err as Error)?.message || 'Weather lookup failed',
        });
      }
    }
  );
};
