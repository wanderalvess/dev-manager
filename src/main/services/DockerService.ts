import { execFile } from 'child_process';
import { promisify } from 'util';
import { DockerContainerInfo, DockerDaemonStatus } from '../../shared/types';
import { isValidIdentifier } from '../utils/security';

const execFileAsync = promisify(execFile);

export class DockerService {
  /**
   * Verifica se o executável do Docker está instalado no sistema e se o Docker Daemon está em execução.
   */
  public async checkDockerStatus(): Promise<DockerDaemonStatus> {
    try {
      const { stdout } = await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], {
        timeout: 5000,
        windowsHide: true
      });

      const version = stdout.trim();
      return {
        installed: true,
        running: true,
        version: version || 'Instalado'
      };
    } catch (err: any) {
      const msg = String(err?.message || '');
      // Se deu erro de ENOENT, não está no PATH / instalado
      if (msg.includes('ENOENT') || err?.code === 'ENOENT') {
        return {
          installed: false,
          running: false,
          error: 'Docker não está instalado ou não foi encontrado no PATH do sistema.'
        };
      }

      // Docker está instalado, mas o daemon está desligado (ex: Docker Desktop fechado)
      return {
        installed: true,
        running: false,
        error: 'O serviço do Docker não está rodando. Inicie o Docker Desktop ou o serviço do Docker.'
      };
    }
  }

  /**
   * Lista todos os containers locais (em execução e parados).
   */
  public async listContainers(): Promise<DockerContainerInfo[]> {
    try {
      const { stdout } = await execFileAsync(
        'docker',
        ['ps', '-a', '--format', '{"id":"{{.ID}}","names":"{{.Names}}","image":"{{.Image}}","state":"{{.State}}","status":"{{.Status}}","ports":"{{.Ports}}","created":"{{.CreatedAt}}"}'],
        {
          timeout: 8000,
          windowsHide: true
        }
      );

      const lines = stdout.trim().split('\n').filter((l) => l.trim().length > 0);
      const containers: DockerContainerInfo[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          let state = (parsed.state || 'unknown').toLowerCase();
          if (!['running', 'exited', 'paused', 'restarting', 'created', 'dead'].includes(state)) {
            state = 'unknown';
          }

          containers.push({
            id: parsed.id || '',
            names: parsed.names || '',
            image: parsed.image || '',
            state: state as any,
            status: parsed.status || '',
            ports: parsed.ports || '',
            created: parsed.created || ''
          });
        } catch {
          // Ignora linha com parse inválido
        }
      }

      return containers;
    } catch (err: any) {
      console.error('[DockerService] Erro ao listar containers:', err);
      return [];
    }
  }

  /**
   * Inicia um container existente.
   */
  public async startContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      await execFileAsync('docker', ['start', containerId], {
        timeout: 15000,
        windowsHide: true
      });
      return true;
    } catch (err: any) {
      console.error(`[DockerService] Erro ao iniciar container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao iniciar container');
    }
  }

  /**
   * Para um container em execução.
   */
  public async stopContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      await execFileAsync('docker', ['stop', containerId], {
        timeout: 20000,
        windowsHide: true
      });
      return true;
    } catch (err: any) {
      console.error(`[DockerService] Erro ao parar container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao parar container');
    }
  }

  /**
   * Reinicia um container.
   */
  public async restartContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      await execFileAsync('docker', ['restart', containerId], {
        timeout: 20000,
        windowsHide: true
      });
      return true;
    } catch (err: any) {
      console.error(`[DockerService] Erro ao reiniciar container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao reiniciar container');
    }
  }

  /**
   * Obtém os logs mais recentes de um container.
   */
  public async getContainerLogs(containerId: string, lines = 200): Promise<string> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    const safeLines = Math.min(Math.max(Number(lines) || 200, 10), 1000);

    try {
      const { stdout, stderr } = await execFileAsync(
        'docker',
        ['logs', '--tail', String(safeLines), containerId],
        {
          timeout: 10000,
          windowsHide: true,
          maxBuffer: 5 * 1024 * 1024
        }
      );

      return stdout || stderr || '(Sem logs registrados)';
    } catch (err: any) {
      return err.stderr || err.stdout || `Erro ao obter logs: ${err.message}`;
    }
  }

  /**
   * Remove forçadamente um container.
   */
  public async removeContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      await execFileAsync('docker', ['rm', '-f', containerId], {
        timeout: 15000,
        windowsHide: true
      });
      return true;
    } catch (err: any) {
      console.error(`[DockerService] Erro ao remover container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao remover container');
    }
  }

  /**
   * Validação de segurança para ID ou nome do container (evita injection de argumentos)
   */
  private isValidContainerId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Docker IDs são hex (12 a 64 caracteres) ou nomes com [a-zA-Z0-9_.-]
    return /^[a-zA-Z0-9_.-]{2,128}$/.test(id.trim());
  }
}
