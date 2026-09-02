import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import type { DockerContainerInfo } from '../../shared/types.js';

export class DockerSocketService {
  private socketPath: string;

  constructor(customSocketPath?: string) {
    if (customSocketPath) {
      this.socketPath = customSocketPath;
    } else if (process.env.DOCKER_SOCKET_PATH) {
      this.socketPath = process.env.DOCKER_SOCKET_PATH;
    } else {
      this.socketPath = os.platform() === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    }
  }

  public isSocketAvailable(): boolean {
    if (os.platform() === 'win32') {
      // Named pipes on Windows
      return true; // We test connectivity on request
    }
    try {
      return fs.existsSync(this.socketPath);
    } catch {
      return false;
    }
  }

  public async requestDockerApi<T = any>(endpoint: string, method: 'GET' | 'POST' = 'GET', postData?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        socketPath: this.socketPath,
        path: endpoint,
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 4000,
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = body ? JSON.parse(body) : ({} as T);
              resolve(data);
            } catch {
              resolve(body as unknown as T);
            }
          } else {
            reject(new Error(`Docker API error HTTP ${res.statusCode}: ${body || res.statusMessage}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy(new Error('Docker socket request timed out (>4s)'));
      });

      if (postData && method === 'POST') {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }

      req.end();
    });
  }

  public static formatContainer(c: any): DockerContainerInfo {
    const labels: Record<string, string> = c.Labels || {};
    const isDashParkEnabled = labels['dashpark.enable'] === 'true';

    const rawName = (c.Names && c.Names[0]) ? c.Names[0].replace(/^\//, '') : (c.Id ? c.Id.slice(0, 12) : 'container');

    const ports = (c.Ports || []).map((p: any) => {
      if (typeof p === 'string') return p;
      if (p.IP && p.PublicPort) {
        return `${p.IP}:${p.PublicPort}->${p.PrivatePort}/${p.Type || 'tcp'}`;
      }
      return `${p.PrivatePort}/${p.Type || 'tcp'}`;
    });

    let state: DockerContainerInfo['state'] = 'unknown';
    const rawState = (c.State || '').toLowerCase();
    if (rawState === 'running') state = 'running';
    else if (rawState === 'exited') state = 'exited';
    else if (rawState === 'paused') state = 'paused';
    else if (rawState === 'restarting') state = 'restarting';

    return {
      id: c.Id,
      name: labels['dashpark.name'] || rawName,
      image: c.Image,
      state,
      status: c.Status || '',
      ports,
      labels,
      dashParkMeta: {
        enabled: isDashParkEnabled,
        name: labels['dashpark.name'] || rawName,
        icon: labels['dashpark.icon'] || 'docker',
        url: labels['dashpark.url'],
        group: labels['dashpark.group'] || 'Docker Services',
        category: labels['dashpark.category'] || labels['dashpark.group'] || 'Docker Services',
        bentoSpan: labels['dashpark.bentoSpan'] as any,
      },
    };
  }

  public async getContainers(all: boolean = true): Promise<DockerContainerInfo[]> {
    try {
      const rawContainers = await this.requestDockerApi<any[]>(`/containers/json?all=${all ? 1 : 0}`);
      if (!Array.isArray(rawContainers)) return [];

      return rawContainers.map((c) => DockerSocketService.formatContainer(c));
    } catch {
      // Docker socket is not available or non-responsive, fail gracefully
      return [];
    }
  }

  public async restartContainer(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.requestDockerApi(`/containers/${encodeURIComponent(id)}/restart`, 'POST');
      return { success: true, message: `Container ${id} restarted successfully` };
    } catch (err: unknown) {
      return { success: false, message: (err as Error)?.message || 'Failed to restart container' };
    }
  }

  public async startContainer(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.requestDockerApi(`/containers/${encodeURIComponent(id)}/start`, 'POST');
      return { success: true, message: `Container ${id} started successfully` };
    } catch (err: unknown) {
      return { success: false, message: (err as Error)?.message || 'Failed to start container' };
    }
  }

  public async stopContainer(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.requestDockerApi(`/containers/${encodeURIComponent(id)}/stop`, 'POST');
      return { success: true, message: `Container ${id} stopped successfully` };
    } catch (err: unknown) {
      return { success: false, message: (err as Error)?.message || 'Failed to stop container' };
    }
  }
}

export const globalDockerSocket = new DockerSocketService();
