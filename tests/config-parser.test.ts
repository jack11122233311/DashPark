import { describe, it, expect } from 'vitest';
import { parseConfig } from '../src/server/config/parser.js';
import fs from 'node:fs';
import path from 'node:path';

describe('DashPark Config Parser Engine', () => {
  it('should successfully parse a valid sample YAML configuration', () => {
    const samplePath = path.resolve(process.cwd(), 'config', 'dashpark.sample.yaml');
    const sampleContent = fs.readFileSync(samplePath, 'utf-8');

    const result = parseConfig(sampleContent);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.config).toBeDefined();
    expect(result.config?.version).toBe('0.0.1');
    expect(result.config?.meta.title).toBe('DashPark');
    expect(result.config?.categories.length).toBeGreaterThanOrEqual(3);
    
    // Check first service
    const mediaCat = result.config?.categories.find((c) => c.id === 'media');
    expect(mediaCat).toBeDefined();
    expect(mediaCat?.services.length).toBeGreaterThan(0);
    expect(mediaCat?.services[0].name).toBe('Plex Media Server');
  });

  it('should catch YAML syntax / indentation errors with line and column diagnostics', () => {
    const invalidYaml = `
version: "0.0.1"
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
version: "0.0.1"
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
      version: '0.0.1',
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
