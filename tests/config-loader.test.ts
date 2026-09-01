import { describe, it, expect, afterEach } from 'vitest';
import { ConfigLoader } from '../src/server/config/loader.js';
import fs from 'node:fs';
import path from 'node:path';

describe('DashPark ConfigLoader Auto-Seeding', () => {
  const testEmptyDir = path.resolve(process.cwd(), 'tests', 'fixtures-empty-config');
  let activeLoader: ConfigLoader | null = null;

  afterEach(() => {
    if (activeLoader) {
      activeLoader.stopWatching();
      activeLoader = null;
    }
    if (fs.existsSync(testEmptyDir)) {
      fs.rmSync(testEmptyDir, { recursive: true, force: true });
    }
  });

  it('should automatically auto-seed dashpark.sample.yaml when given an empty directory', () => {
    fs.mkdirSync(testEmptyDir, { recursive: true });

    // Confirm directory is initially empty
    expect(fs.readdirSync(testEmptyDir).length).toBe(0);

    activeLoader = new ConfigLoader(testEmptyDir);
    const result = activeLoader.load();

    expect(result.valid).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.categories.length).toBe(5);

    // Confirm sample file was auto-seeded on disk
    const targetSample = path.join(testEmptyDir, 'dashpark.sample.yaml');
    expect(fs.existsSync(targetSample)).toBe(true);

    activeLoader.stopWatching();
  });
});
