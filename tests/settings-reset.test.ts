import { describe, it, expect } from 'vitest';
import { parseConfig } from '../src/server/config/parser.js';

describe('Settings & Glassmorphism Schema Validation', () => {
  it('should parse custom background wallpaper and glassmorphism parameters correctly', () => {
    const yamlContent = `
version: "0.3.0"
meta:
  title: "Glassmorphism Homelab"
  subtitle: "Custom Cyberpunk Park"
  theme: "cyberpunk"
  accentColor: "#06b6d4"
  backgroundUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5"
  glassBlur: 20
  glassOpacity: 0.65
  showClock: true
  clockFormat: "12h"
  showSeconds: true
  showDate: false
  searchEngine:
    enabled: true
    provider: "searxng"
pages:
  - id: "home"
    name: "Overview"
    categories: []
`;

    const result = parseConfig(yamlContent);
    expect(result.valid).toBe(true);
    expect(result.config?.meta.backgroundUrl).toBe('https://images.unsplash.com/photo-1509198397868-475647b2a1e5');
    expect(result.config?.meta.glassBlur).toBe(20);
    expect(result.config?.meta.glassOpacity).toBe(0.65);
    expect(result.config?.meta.clockFormat).toBe('12h');
    expect(result.config?.meta.showSeconds).toBe(true);
    expect(result.config?.meta.showDate).toBe(false);
    expect(result.config?.meta.searchEngine?.provider).toBe('searxng');
  });

  it('should fallback to valid defaults for missing optional settings', () => {
    const yamlContent = `
version: "0.3.0"
meta:
  title: "Simple Dashboard"
pages:
  - id: "home"
    name: "Overview"
    categories: []
`;

    const result = parseConfig(yamlContent);
    expect(result.valid).toBe(true);
    expect(result.config?.meta.glassBlur).toBe(12);
    expect(result.config?.meta.glassOpacity).toBe(0.75);
    expect(result.config?.meta.showSeconds).toBe(true);
    expect(result.config?.meta.showDate).toBe(true);
  });
});
