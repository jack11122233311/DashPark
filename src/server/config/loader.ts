import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { parseConfig, type ParseResult } from './parser.js';
import type { ConfigResponse } from '../../shared/types.js';

export class ConfigLoader extends EventEmitter {
  private configDir: string;
  private currentFilePath: string | null = null;
  private currentResult: ParseResult | null = null;
  private lastValidResult: ParseResult | null = null;
  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(configDir?: string) {
    super();
    this.configDir = configDir || path.resolve(process.cwd(), 'config');
  }

  /**
   * Discovers the best configuration file in priority order
   */
  public findConfigFile(): { filePath: string; isSample: boolean; isJson: boolean } {
    const candidates = [
      { name: 'dashpark.yaml', isSample: false, isJson: false },
      { name: 'dashpark.yml', isSample: false, isJson: false },
      { name: 'dashpark.json', isSample: false, isJson: true },
      { name: 'dashpark.sample.yaml', isSample: true, isJson: false },
      { name: 'dashpark.sample.yml', isSample: true, isJson: false },
    ];

    if (!fs.existsSync(this.configDir)) {
      try {
        fs.mkdirSync(this.configDir, { recursive: true });
      } catch (e) {
        console.error(`[DashPark] Failed to create config dir: ${this.configDir}`, e);
      }
    }

    for (const c of candidates) {
      const fullPath = path.join(this.configDir, c.name);
      if (fs.existsSync(fullPath)) {
        return { filePath: fullPath, isSample: c.isSample, isJson: c.isJson };
      }
    }

    // Default to dashpark.sample.yaml if none found
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
      return {
        valid: false,
        source: 'fallback',
        filePath,
        lastLoadedAt: new Date().toISOString(),
        diagnostics: [
          {
            line: 1,
            column: 1,
            message: `Configuration file not found at ${filePath}. Please create dashpark.yaml in the config directory.`,
            severity: 'error',
          },
        ],
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
