import { describe, it, expect } from 'vitest';
import { parseConfig } from '../src/server/config/parser.js';
import fs from 'node:fs';
import path from 'node:path';

describe('DashPark Config Parser Engine', () => {
  it('should successfully parse the comprehensive sample YAML configuration', () => {
    const samplePath = path.resolve(process.cwd(), 'config', 'dashpark.sample.yaml');
    const sampleContent = fs.readFileSync(samplePath, 'utf-8');

    const result = parseConfig(sampleContent);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.config).toBeDefined();
    expect(result.config?.meta.title).toBe('Homelab Central');
    expect(result.config?.categories).toHaveLength(5);

    // Verify all 5 showcase categories exist
    const categoryIds = result.config?.categories.map((c) => c.id);
    expect(categoryIds).toContain('media');
    expect(categoryIds).toContain('security');
    expect(categoryIds).toContain('infra');
    expect(categoryIds).toContain('smarthome');
    expect(categoryIds).toContain('monitoring');

    // Verify total service count across the sample
    const totalServices = result.config?.categories.reduce((acc, c) => acc + c.services.length, 0);
    expect(totalServices).toBeGreaterThanOrEqual(20);

    // Check media category details
    const mediaCat = result.config?.categories.find((c) => c.id === 'media');
    expect(mediaCat).toBeDefined();
    expect(mediaCat?.services.length).toBeGreaterThanOrEqual(5);
    expect(mediaCat?.services[0].name).toBe('Emby Media Server');
    expect(mediaCat?.services[0].tags).toContain('streaming');
  });

  it('should catch YAML syntax / indentation errors with line and column diagnostics', () => {
    const invalidYaml = `
version: "0.0.2"
meta:
  title: "Broken Dashboard"
categories:
  - id: "media"
   name: "Bad Indentation" # Indentation mismatch here!
`;

    const result = parseConfig(invalidYaml);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].severity).toBe('error');
    expect(result.diagnostics[0].line).toBeGreaterThanOrEqual(6);
    expect(result.diagnostics[0].snippet).toBeDefined();
    expect(result.diagnostics[0].snippet).toContain('^');
  });

  it('should catch schema validation errors (e.g. invalid URL)', () => {
    const invalidSchemaYaml = `
version: "0.0.2"
meta:
  title: "DashPark"
categories:
  - id: "test"
    name: "Testing Category"
    services:
      - id: "bad-url"
        name: "Bad Service"
        url: "not-a-valid-url"
`;

    const result = parseConfig(invalidSchemaYaml);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].message).toContain('Service URL must be a valid absolute URL');
  });

  it('should successfully parse valid JSON configuration', () => {
    const validJson = JSON.stringify({
      version: '0.0.2',
      meta: {
        title: 'JSON Park',
        theme: 'nord',
        layout: 'grid',
        showClock: true,
      },
      categories: [
        {
          id: 'servers',
          name: 'Home Servers',
          services: [
            {
              id: 'router',
              name: 'OPNsense',
              url: 'http://192.168.1.1',
            },
          ],
        },
      ],
    });

    const result = parseConfig(validJson, true);
    expect(result.valid).toBe(true);
    expect(result.config?.meta.title).toBe('JSON Park');
    expect(result.config?.meta.theme).toBe('nord');
    expect(result.config?.categories[0].services[0].name).toBe('OPNsense');
  });
});
