import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { parseConfig } from '../config/parser.js';
import { ConfigLoader } from '../config/loader.js';
import { globalHealthChecker } from '../services/health-checker.js';

export function createConfigRoutes(configLoader: ConfigLoader): FastifyPluginAsync {
  return async (fastify) => {
    // Config save endpoint with atomic file writes and backup
    fastify.post<{ Body: { content?: string; isJson?: boolean } }>(
      '/api/v1/config/save',
      async (req, reply) => {
        const { content, isJson = false } = req.body || {};

        if (typeof content !== 'string' || content.trim().length === 0) {
          return reply.status(400).send({
            valid: false,
            message: 'Configuration content cannot be empty',
            diagnostics: [{ line: 1, column: 1, message: 'Configuration content is empty', severity: 'error' }],
          });
        }

        // 1. Strict validation
        const parseResult = parseConfig(content, Boolean(isJson));
        if (!parseResult.valid || !parseResult.config) {
          return reply.status(422).send({
            valid: false,
            message: 'Configuration contains syntax or schema errors',
            diagnostics: parseResult.diagnostics,
          });
        }

        // 2. Determine target file path
        const configDir = path.resolve(process.cwd(), 'config');
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        const targetFileName = isJson ? 'dashpark.json' : 'dashpark.yaml';
        const targetPath = path.join(configDir, targetFileName);
        const backupPath = `${targetPath}.bak`;
        const tempPath = `${targetPath}.tmp.${Date.now()}`;

        try {
          // 3. Create backup of current file if it exists
          if (fs.existsSync(targetPath)) {
            try {
              fs.copyFileSync(targetPath, backupPath);
            } catch (backupErr) {
              console.warn('[DashPark] Failed to create .bak backup:', backupErr);
            }
          }

          // 4. Atomic write via temp file rename
          fs.writeFileSync(tempPath, content, 'utf-8');
          fs.renameSync(tempPath, targetPath);

          // 5. Reload config loader & health checker
          const updated = configLoader.load();
          if (parseResult.config) {
            globalHealthChecker.updateConfig(parseResult.config);
          }

          return reply.status(200).send({
            success: true,
            valid: true,
            message: 'Configuration saved and hot-reloaded successfully',
            filePath: targetPath,
            backupPath: fs.existsSync(backupPath) ? backupPath : undefined,
            config: updated.config,
          });
        } catch (writeErr: unknown) {
          // Clean up temp file if present
          if (fs.existsSync(tempPath)) {
            try {
              fs.unlinkSync(tempPath);
            } catch {
              // Ignore
            }
          }

          console.error('[DashPark] Failed to write config file:', writeErr);
          return reply.status(500).send({
            valid: false,
            message: `Failed to write config file: ${(writeErr as Error)?.message || 'Disk I/O error'}`,
            diagnostics: [
              {
                line: 1,
                column: 1,
                message: (writeErr as Error)?.message || 'Disk write failed',
                severity: 'error',
              },
            ],
          });
        }
      }
    );
  };
}
