import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { WslDistroInfo, ContainerEnvironment, ContainerEnvironmentSlot } from '../../shared/types';
import { execFileAsync } from '../utils/security';

export class WslService {
  private cachedDistros: WslDistroInfo[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 4000;

  /**
   * Executa comando retornando Buffer bruto para tratamento correto de UTF-16LE emitido pelo WSL no Windows.
   */
  private runBuffer(cmd: string, timeout = 10000): Promise<Buffer> {
    return new Promise((resolve) => {
      exec(cmd, { encoding: 'buffer', timeout }, (_err, stdout) => {
        resolve(stdout ?? Buffer.alloc(0));
      });
    });
  }

  /**
   * Lista todas as distribuições WSL instaladas no sistema operacional.
   */
  public async listDistros(forceRefresh = false): Promise<WslDistroInfo[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedDistros.length > 0 && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedDistros;
    }

    try {
      const buf = await this.runBuffer('wsl --list --verbose', 8000);
      // wsl --list --verbose emite UTF-16LE no Windows
      const text = buf.toString('utf16le');
      const distros: WslDistroInfo[] = [];

      const lines = text.replace(/\r/g, '').split('\n');
      for (const line of lines.slice(1)) {
        const trimmed = line.replace(/\0/g, '').trim();
        if (!trimmed) continue;

        const isDefault = trimmed.startsWith('*');
        const parts = trimmed.replace(/^\*\s*/, '').split(/\s+/);
        if (parts.length < 3) continue;

        const name = parts[0];
        const state = parts[1] as 'Running' | 'Stopped';
        const version = parseInt(parts[2], 10);

        // Ignora distros exclusivas de backend do Docker Desktop se houver
        if (name === 'docker-desktop' || name === 'docker-desktop-data') {
          continue;
        }

        distros.push({
          name,
          state: state === 'Running' ? 'Running' : 'Stopped',
          version: isNaN(version) ? 2 : version,
          isDefault
        });
      }

      this.cachedDistros = distros;
      this.lastFetchTime = now;
      return distros;
    } catch (err) {
      console.warn('[WslService] Erro ao listar distros WSL:', err);
      return [];
    }
  }

  /**
   * Verifica se o Docker Engine está acessível dentro de uma distro WSL específica.
   */
  public async testDockerInDistro(distroName: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('wsl', ['-d', distroName, '--', 'docker', 'version', '--format', '{{.Server.Version}}'], {
        timeout: 6000,
        windowsHide: true
      });
      return !!stdout && stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Encontra a melhor distro WSL configurada para rodar Docker:
   * 1. Procura por distros com "winthor" ou "ubuntu" no nome.
   * 2. Ou a primeira distro que responda com sucesso ao teste do docker.
   */
  public async findDockerWslDistro(): Promise<string | null> {
    const distros = await this.listDistros();
    if (distros.length === 0) return null;

    // Prioriza distros que tenham 'winthor' no nome
    const winthorDistro = distros.find((d) => d.name.toLowerCase().includes('winthor'));
    if (winthorDistro && (await this.testDockerInDistro(winthorDistro.name))) {
      return winthorDistro.name;
    }

    // Testa distro default
    const defaultDistro = distros.find((d) => d.isDefault);
    if (defaultDistro && (await this.testDockerInDistro(defaultDistro.name))) {
      return defaultDistro.name;
    }

    // Testa as demais
    for (const d of distros) {
      if (d.name !== winthorDistro?.name && d.name !== defaultDistro?.name) {
        if (await this.testDockerInDistro(d.name)) {
          return d.name;
        }
      }
    }

    return null;
  }

  /**
   * Caminho padrão do arquivo de configuração do container-manager:
   * %USERPROFILE%\.container-manager\environments.json
   */
  public getContainerManagerConfigPath(): string {
    return path.join(os.homedir(), '.container-manager', 'environments.json');
  }

  /**
   * Lê a configuração existente do container-manager (~/.container-manager/environments.json).
   */
  public loadContainerManagerConfig(): { environments: ContainerEnvironment[]; snapshotsDir?: string } {
    const cfgPath = this.getContainerManagerConfigPath();
    if (!fs.existsSync(cfgPath)) {
      return { environments: [] };
    }

    try {
      const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      const environments: ContainerEnvironment[] = [];

      if (Array.isArray(raw.environments)) {
        for (const env of raw.environments) {
          const slots: ContainerEnvironmentSlot[] = [];
          if (Array.isArray(env.containers)) {
            for (const item of env.containers) {
              if (typeof item === 'string') {
                const delay = env.delays?.[item];
                slots.push({ id: item, name: item, ...(delay ? { delay } : {}) });
              } else if (item && typeof item === 'object') {
                slots.push({
                  id: item.id || item.name,
                  name: item.name,
                  ...(item.delay ? { delay: item.delay } : {})
                });
              }
            }
          }

          environments.push({
            id: env.id || String(Date.now()),
            name: env.name || 'Sem nome',
            color: env.color || '#0066cc',
            wslDistro: env.wslDistro,
            containers: slots
          });
        }
      }

      return {
        environments,
        snapshotsDir: typeof raw.snapshotsDir === 'string' ? raw.snapshotsDir : undefined
      };
    } catch (err) {
      console.warn('[WslService] Erro ao carregar ~/.container-manager/environments.json:', err);
      return { environments: [] };
    }
  }

  /**
   * Salva um ambiente no ~/.container-manager/environments.json para interoperabilidade total.
   */
  public saveContainerManagerEnvironment(env: ContainerEnvironment): boolean {
    try {
      const cfgPath = this.getContainerManagerConfigPath();
      const dir = path.dirname(cfgPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const current = this.loadContainerManagerConfig();
      const idx = current.environments.findIndex((e) => e.id === env.id);
      if (idx >= 0) {
        current.environments[idx] = env;
      } else {
        current.environments.push(env);
      }

      fs.writeFileSync(cfgPath, JSON.stringify(current, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[WslService] Erro ao salvar ambiente do container-manager:', err);
      return false;
    }
  }

  /**
   * Remove um ambiente do ~/.container-manager/environments.json
   */
  public deleteContainerManagerEnvironment(id: string): boolean {
    try {
      const cfgPath = this.getContainerManagerConfigPath();
      const current = this.loadContainerManagerConfig();
      current.environments = current.environments.filter((e) => e.id !== id);
      fs.writeFileSync(cfgPath, JSON.stringify(current, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[WslService] Erro ao excluir ambiente:', err);
      return false;
    }
  }
}

export const wslService = new WslService();
