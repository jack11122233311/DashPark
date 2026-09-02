import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { ConfigSnapshotInfo } from '../../shared/types.js';

export class SnapshotManager {
  private snapshotsDir: string;
  private maxSnapshots: number = 5;

  constructor(customDir?: string) {
    this.snapshotsDir = customDir || path.resolve(process.cwd(), 'config', 'snapshots');
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  public createSnapshot(yamlContent: string): ConfigSnapshotInfo | null {
    if (!yamlContent || !yamlContent.trim()) return null;

    try {
      const now = new Date();
      const timestampIso = now.toISOString().replace(/[:.]/g, '-');
      const filename = `dashpark.snap.${timestampIso}.yaml`;
      const targetPath = path.join(this.snapshotsDir, filename);

      fs.writeFileSync(targetPath, yamlContent, 'utf-8');

      // Count services in snapshot
      let servicesCount = 0;
      try {
        const parsed = parseYaml(yamlContent);
        if (parsed?.pages) {
          servicesCount = parsed.pages.reduce((acc: number, p: any) => {
            return acc + (p.categories || []).reduce((cAcc: number, c: any) => cAcc + (c.services?.length || 0), 0);
          }, 0);
        } else if (parsed?.categories) {
          servicesCount = parsed.categories.reduce((acc: number, c: any) => acc + (c.services?.length || 0), 0);
        }
      } catch {
        // Ignore parse error
      }

      this.pruneSnapshots();

      return {
        filename,
        timestamp: now.toISOString(),
        sizeBytes: Buffer.byteLength(yamlContent, 'utf-8'),
        servicesCount,
      };
    } catch (err) {
      console.warn('[DashPark Snapshots] Failed to create snapshot:', err);
      return null;
    }
  }

  public listSnapshots(): ConfigSnapshotInfo[] {
    if (!fs.existsSync(this.snapshotsDir)) return [];

    try {
      const files = fs.readdirSync(this.snapshotsDir).filter((f) => f.startsWith('dashpark.snap.') && f.endsWith('.yaml'));

      const list: ConfigSnapshotInfo[] = [];

      files.forEach((file) => {
        const fullPath = path.join(this.snapshotsDir, file);
        const stats = fs.statSync(fullPath);
        let servicesCount = 0;

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const parsed = parseYaml(content);
          if (parsed?.pages) {
            servicesCount = parsed.pages.reduce((acc: number, p: any) => {
              return acc + (p.categories || []).reduce((cAcc: number, c: any) => cAcc + (c.services?.length || 0), 0);
            }, 0);
          } else if (parsed?.categories) {
            servicesCount = parsed.categories.reduce((acc: number, c: any) => acc + (c.services?.length || 0), 0);
          }
        } catch {
          // Ignore
        }

        list.push({
          filename: file,
          timestamp: stats.mtime.toISOString(),
          sizeBytes: stats.size,
          servicesCount,
        });
      });

      // Sort newest first
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }

  public getSnapshotContent(filename: string): string | null {
    const cleanName = path.basename(filename);
    const target = path.join(this.snapshotsDir, cleanName);
    if (fs.existsSync(target)) {
      return fs.readFileSync(target, 'utf-8');
    }
    return null;
  }

  public restoreSnapshot(filename: string, targetFilePath?: string): boolean {
    const content = this.getSnapshotContent(filename);
    if (!content) return false;

    const dest = targetFilePath || path.resolve(this.snapshotsDir, '..', 'dashpark.yaml');
    try {
      fs.writeFileSync(dest, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  public pruneSnapshots(max?: number): void {
    const limit = max ?? this.maxSnapshots;
    const snapshots = this.listSnapshots();
    if (snapshots.length > limit) {
      const toDelete = snapshots.slice(limit);
      toDelete.forEach((s) => {
        try {
          fs.unlinkSync(path.join(this.snapshotsDir, s.filename));
        } catch {
          // Ignore delete errors
        }
      });
    }
  }
}

export const globalSnapshotManager = new SnapshotManager();
