import type { WeatherData } from '../../shared/types.js';

const WMO_CODE_MAP: Record<number, string> = {
  0: 'Clear Sky',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  71: 'Slight Snow',
  73: 'Moderate Snow',
  75: 'Heavy Snow',
  80: 'Slight Showers',
  81: 'Moderate Showers',
  82: 'Violent Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Hail',
};

interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
}

export class WeatherService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTtlMs = 15 * 60 * 1000; // 15 minutes

  public static getConditionDescription(code: number): string {
    return WMO_CODE_MAP[code] || 'Unknown';
  }

  public getCachedWeather(cacheKey: string): WeatherData | null {
    const entry = this.cache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    return null;
  }

  public setCachedWeather(cacheKey: string, data: WeatherData, ttlMs?: number): void {
    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + (ttlMs || this.cacheTtlMs),
    });
  }

  public async getWeather(
    lat: number = 51.5074,
    lon: number = -0.1278,
    units: 'celsius' | 'fahrenheit' = 'celsius',
    city?: string
  ): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${units}`;
    const cached = this.getCachedWeather(cacheKey);

    if (cached) {
      return cached;
    }

    const tempUnitParam = units === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=${tempUnitParam}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'DashPark-Homelab-Dashboard/1.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const current = json.current || {};
    const code = current.weather_code ?? 0;
    const condition = WMO_CODE_MAP[code] || 'Clear';

    const data: WeatherData = {
      temperature: Math.round((current.temperature_2m ?? 20) * 10) / 10,
      unit: units === 'fahrenheit' ? '°F' : '°C',
      weatherCode: code,
      condition,
      humidity: current.relative_humidity_2m ?? 50,
      windSpeed: current.wind_speed_10m ?? 0,
      location: city || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      timestamp: new Date().toISOString(),
    };

    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return data;
  }
}

export const globalWeatherService = new WeatherService();
