import type { FastifyPluginAsync } from 'fastify';
import path from 'node:path';
import fs from 'node:fs';

export const customRoutes: FastifyPluginAsync = async (fastify) => {
  const configDir = path.resolve(process.cwd(), 'config');
  const customCssPath = path.join(configDir, 'custom.css');
  const iconsDir = path.join(configDir, 'icons');

  // Ensure directories exist
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  // 1. Get Custom CSS
  fastify.get('/api/v1/custom/css', async (_req, reply) => {
    if (fs.existsSync(customCssPath)) {
      const content = fs.readFileSync(customCssPath, 'utf-8');
      return reply.type('text/css').send(content);
    }
    return reply.type('text/css').send('/* No custom CSS configured */\n');
  });

  // 2. Save Custom CSS
  fastify.post<{ Body: { css?: string } }>('/api/v1/custom/css', async (req, reply) => {
    const { css } = req.body || { css: '' };
    try {
      fs.writeFileSync(customCssPath, css || '', 'utf-8');
      return reply.status(200).send({ success: true, message: 'Custom CSS updated' });
    } catch (err: unknown) {
      return reply.status(500).send({ success: false, error: (err as Error)?.message || 'Failed to save CSS' });
    }
  });

  // 3. Upload Custom Icon (Base64 data or SVG string)
  fastify.post<{ Body: { filename: string; dataUrl: string } }>('/api/v1/custom/icons', async (req, reply) => {
    const { filename, dataUrl } = req.body || {};
    if (!filename || !dataUrl) {
      return reply.status(400).send({ success: false, error: 'Filename and dataUrl are required' });
    }

    const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');
    const targetFile = path.join(iconsDir, cleanFilename);

    try {
      if (dataUrl.startsWith('data:')) {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          fs.writeFileSync(targetFile, buffer);
        } else {
          // Plain SVG or text data URI
          const commaIdx = dataUrl.indexOf(',');
          const raw = decodeURIComponent(dataUrl.slice(commaIdx + 1));
          fs.writeFileSync(targetFile, raw, 'utf-8');
        }
      } else {
        fs.writeFileSync(targetFile, dataUrl, 'utf-8');
      }

      return reply.status(200).send({
        success: true,
        filename: cleanFilename,
        iconUrl: `/icons/custom/${cleanFilename}`,
      });
    } catch (err: unknown) {
      return reply.status(500).send({ success: false, error: (err as Error)?.message || 'Failed to save icon' });
    }
  });

  // 4. Serve Custom Icon
  fastify.get<{ Params: { filename: string } }>('/icons/custom/:filename', async (req, reply) => {
    const { filename } = req.params;
    const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = path.join(iconsDir, cleanFilename);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send('Icon not found');
    }

    const ext = path.extname(cleanFilename).toLowerCase();
    let mime = 'image/png';
    if (ext === '.svg') mime = 'image/svg+xml';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.webp') mime = 'image/webp';
    else if (ext === '.ico') mime = 'image/x-icon';

    const stream = fs.createReadStream(filePath);
    return reply.type(mime).send(stream);
  });
};
