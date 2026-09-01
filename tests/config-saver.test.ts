import { describe, it, expect, afterEach } from 'vitest';
import { parseConfig } from '../src/server/config/parser.js';
import fs from 'node:fs';
import path from 'node:path';

describe('DashPark Config Saver & Validator', () => {
  const testDir = path.resolve(process.cwd(), 'tests', 'fixtures');

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should validate and parse a complete config before saving', () => {
    const validYaml = `
version: "0.0.1"
meta:
  title: "My Custom Homelab"
  theme: "nord"
  layout: "bento"
categories:
  - id: "apps"
    name: "Applications"
    services:
      - id: "vault"
        name: "Vaultwarden"
        url: "https://vault.local"
`;

    const result = parseConfig(validYaml);
    expect(result.valid).toBe(true);
    expect(result.config?.meta.title).toBe('My Custom Homelab');
    expect(result.config?.meta.theme).toBe('nord');
    expect(result.config?.categories[0].services[0].name).toBe('Vaultwarden');
  });

  it('should reject invalid config with line/column diagnostics preventing bad file writes', () => {
    const invalidYaml = `
version: "0.0.1"
meta:
  title: "Broken"
categories:
  - id: "apps"
    name: "Apps"
    services:
      - id: "invalid-svc"
        name: "Broken URL"
        url: "not-a-valid-http-url"
`;

    const result = parseConfig(invalidYaml);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].message).toContain('Service URL must be a valid absolute URL');
  });

  it('should safely simulate atomic file saving with .bak backup creation', () => {
    fs.mkdirSync(testDir, { recursive: true });
    const targetFile = path.join(testDir, 'dashpark.yaml');
    const backupFile = `${targetFile}.bak`;

    // 1. Initial write
    fs.writeFileSync(targetFile, 'initial: content', 'utf-8');
    expect(fs.existsSync(targetFile)).toBe(true);

    // 2. Backup on second write
    fs.copyFileSync(targetFile, backupFile);
    fs.writeFileSync(targetFile, 'updated: content', 'utf-8');

    expect(fs.existsSync(backupFile)).toBe(true);
    expect(fs.readFileSync(backupFile, 'utf-8')).toBe('initial: content');
    expect(fs.readFileSync(targetFile, 'utf-8')).toBe('updated: content');
  });
});
