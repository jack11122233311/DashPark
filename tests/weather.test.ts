import { describe, it, expect } from 'vitest';
import { WeatherService } from '../src/server/services/weather.js';

describe('Weather Telemetry Service (Open-Meteo & WMO Codes)', () => {
  it('should map WMO weather codes to human-readable condition descriptions', () => {
    expect(WeatherService.getConditionDescription(0)).toBe('Clear Sky');
    expect(WeatherService.getConditionDescription(1)).toBe('Mainly Clear');
    expect(WeatherService.getConditionDescription(2)).toBe('Partly Cloudy');
    expect(WeatherService.getConditionDescription(3)).toBe('Overcast');
    expect(WeatherService.getConditionDescription(45)).toBe('Foggy');
    expect(WeatherService.getConditionDescription(61)).toBe('Slight Rain');
    expect(WeatherService.getConditionDescription(65)).toBe('Heavy Rain');
    expect(WeatherService.getConditionDescription(95)).toBe('Thunderstorm');
    expect(WeatherService.getConditionDescription(999)).toBe('Unknown');
  });

  it('should manage memory caching TTL for weather data', () => {
    const service = new WeatherService();
    const cacheKey = '51.5_-0.12_celsius';
    const fakeData = {
      temperature: 21.5,
      condition: 'Partly Cloudy',
      weatherCode: 2,
      unit: '°C' as const,
      city: 'London',
      updatedAt: new Date().toISOString(),
    };

    service.setCachedWeather(cacheKey, fakeData);
    const retrieved = service.getCachedWeather(cacheKey);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.temperature).toBe(21.5);
    expect(retrieved?.condition).toBe('Partly Cloudy');
  });
});
