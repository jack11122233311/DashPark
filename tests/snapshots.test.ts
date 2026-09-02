import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SnapshotManager } from '../src/server/services/snapshot-manager.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Versioned Configuration Snapshots & Rollback', () => {
  const testDir = path.resolve(process.cwd(), 'tests', 'fixtures_snap');
  const snapDir = path.join(testDir, 'snapshots');
  const activeConfigFile = path.join(testDir, 'dashpark.yaml');

  beforeEach(() => {
    fs.mkdirSync(snapDir, { recursive: true });
    fs.writeFileSync(activeConfigFile, 'version: "0.0.1"\nmeta:\n  title: Active\ncategories: []\n', 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create versioned snapshot file and list available snapshots', () => {
    const manager = new SnapshotManager(snapDir);
    const yamlContent = `
version: "0.0.1"
meta:
  title: "Snapshot Test"
categories:
  - id: "apps"
    name: "Apps"
    services:
      - id: "s1"
        name: "Service 1"
        url: "http://example.com"
`;

    const snap = manager.createSnapshot(yamlContent);
    expect(snap).not.toBeNull();
    expect(snap?.filename).toContain('dashpark.snap.');
    expect(snap?.servicesCount).toBe(1);

    const list = manager.listSnapshots();
    expect(list.length).toBe(1);
    expect(list[0].filename).toBe(snap?.filename);
  });

  it('should restore target snapshot back to active configuration file', () => {
    const manager = new SnapshotManager(snapDir);
    const originalYaml = 'version: "0.0.1"\nmeta:\n  title: Original Snapshot\ncategories: []\n';
    const snap = manager.createSnapshot(originalYaml);

    // Modify active config
    fs.writeFileSync(activeConfigFile, 'version: "0.0.1"\nmeta:\n  title: Modified\ncategories: []\n', 'utf-8');

    // Restore
    const restored = manager.restoreSnapshot(snap!.filename, activeConfigFile);
    expect(restored).toBe(true);

    const currentContent = fs.readFileSync(activeConfigFile, 'utf-8');
    expect(currentContent).toBe(originalYaml);
  });

  it('should maintain rolling window of max 5 snapshots', () => {
    const manager = new SnapshotManager(snapDir);

    for (let i = 1; i <= 8; i++) {
      const yaml = `version: "0.0.1"\nmeta:\n  title: Snap ${i}\ncategories: []\n`;
      const snapPath = path.join(snapDir, `dashpark.snap.${1700000000000 + i * 1000}.yaml`);
      fs.writeFileSync(snapPath, yaml, 'utf-8');
    }

    manager.pruneSnapshots(5);
    const list = manager.listSnapshots();
    expect(list.length).toBe(5);
  });
});
