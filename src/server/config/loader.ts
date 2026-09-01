import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { parseConfig, type ParseResult } from './parser.js';
import { DEFAULT_SAMPLE_YAML } from './default-config.js';
import type { ConfigResponse } from '../../shared/types.js';

export class ConfigLoader extends EventEmitter {
  private configDir: string;
  private currentFilePath: string | null = null;
  private currentResult: ParseResult | null = null;
  private lastValidResult: ParseResult | null = null;
  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  private hasAttemptedInit: boolean = false;

  constructor(configDir?: string) {
    super();
    this.configDir = configDir || path.resolve(process.cwd(), 'config');
    this.ensureConfigInitialized();
  }

  /**
   * Auto-seeds the default sample configuration if the config directory is empty
   * (e.g., when an empty host directory is mounted into /app/config in Docker)
   */
  private ensureConfigInitialized(): void {
    if (this.hasAttemptedInit) return;
    this.hasAttemptedInit = true;

    if (!fs.existsSync(this.configDir)) {
      try {
        fs.mkdirSync(this.configDir, { recursive: true });
      } catch {
        // Handled below if read-only
      }
    }

    const targetSampleFile = path.join(this.configDir, 'dashpark.sample.yaml');
    const existingCandidates = [
      path.join(this.configDir, 'dashpark.yaml'),
      path.join(this.configDir, 'dashpark.yml'),
      path.join(this.configDir, 'dashpark.json'),
      targetSampleFile,
    ];

    const hasAnyConfig = existingCandidates.some((f) => fs.existsSync(f));

    if (!hasAnyConfig) {
      try {
        // Look for built-in container defaults or write embedded template
        const containerDefault = path.resolve(process.cwd(), 'defaults', 'dashpark.sample.yaml');
        if (fs.existsSync(containerDefault)) {
          fs.copyFileSync(containerDefault, targetSampleFile);
          console.log(`[DashPark] Auto-seeded default configuration to ${targetSampleFile}`);
        } else {
          fs.writeFileSync(targetSampleFile, DEFAULT_SAMPLE_YAML, 'utf-8');
          console.log(`[DashPark] Auto-seeded embedded configuration to ${targetSampleFile}`);
        }
      } catch (err: any) {
        if (err?.code === 'EACCES' || err?.code === 'EPERM') {
          console.log(`[DashPark] Notice: Mounted config folder is read-only (EACCES). Running with in-memory template.`);
        } else {
          console.warn(`[DashPark] Notice: Could not write sample config to disk (${err?.message || err}). Using in-memory fallback.`);
        }
      }
    }
  }

  /**
   * Discovers the best configuration file in priority order
   */
  public findConfigFile(): { filePath: string; isSample: boolean; isJson: boolean } {
    this.ensureConfigInitialized();

    const candidates = [
      { name: 'dashpark.yaml', isSample: false, isJson: false },
      { name: 'dashpark.yml', isSample: false, isJson: false },
      { name: 'dashpark.json', isSample: false, isJson: true },
      { name: 'dashpark.sample.yaml', isSample: true, isJson: false },
      { name: 'dashpark.sample.yml', isSample: true, isJson: false },
    ];

    for (const c of candidates) {
      const fullPath = path.join(this.configDir, c.name);
      if (fs.existsSync(fullPath)) {
        return { filePath: fullPath, isSample: c.isSample, isJson: c.isJson };
      }
    }

    // Default to dashpark.sample.yaml
    const samplePath = path.join(this.configDir, 'dashpark.sample.yaml');
    return { filePath: samplePath, isSample: true, isJson: false };
  }

  /**
   * Loads and parses the active configuration file
   */
  public load(): ConfigResponse {
    const { filePath, isSample, isJson } = this.findConfigFile();
    this.currentFilePath = filePath;

    if (!fs.existsSync(filePath)) {
      // Graceful in-memory fallback parsing if file could not be written to disk
      const fallbackResult = parseConfig(DEFAULT_SAMPLE_YAML, false);
      return {
        valid: fallbackResult.valid,
        source: 'sample',
        filePath: 'embedded://dashpark.sample.yaml',
        lastLoadedAt: new Date().toISOString(),
        config: fallbackResult.config,
        diagnostics: [],
        rawYaml: DEFAULT_SAMPLE_YAML,
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result = parseConfig(content, isJson);
      this.currentResult = result;

      if (result.valid) {
        this.lastValidResult = result;
      }

      this.startWatching(filePath);

      return {
        valid: result.valid,
        source: isSample ? 'sample' : 'file',
        filePath,
        lastLoadedAt: new Date().toISOString(),
        config: result.config || this.lastValidResult?.config,
        diagnostics: result.diagnostics,
        rawYaml: content,
      };
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || 'Failed to read configuration file';
      return {
        valid: false,
        source: isSample ? 'sample' : 'file',
        filePath,
        lastLoadedAt: new Date().toISOString(),
        diagnostics: [
          {
            line: 1,
            column: 1,
            message: errorMsg,
            severity: 'error',
          },
        ],
      };
    }
  }

  /**
   * Starts watching the configuration file for changes
   */
  private startWatching(targetPath: string): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    try {
      this.watcher = fs.watch(targetPath, (eventType) => {
        if (eventType === 'change' || eventType === 'rename') {
          if (this.debounceTimer) clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            console.log(`[DashPark] Detected change in config: ${targetPath}`);
            const updated = this.load();
            this.emit('changed', updated);
          }, 200);
        }
      });
    } catch (err) {
      console.warn(`[DashPark] Could not start fs.watch on ${targetPath}`, err);
    }
  }

  public stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
