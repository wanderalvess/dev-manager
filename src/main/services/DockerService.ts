import fs from 'fs';
import { spawn } from 'child_process';
import {
  DockerContainerInfo,
  DockerDaemonStatus,
  DockerContainerStats,
  ComposeServiceStatus,
  DockerContainerInspect,
  DockerContainerMount,
  DockerContainerPortBinding,
  OracleMaintenanceResult,
  OracleDataPumpParams
} from '../../shared/types';
import { execFileAsync, isValidIdentifier, isSafeDockerImageTag, isSafeLocalPath } from '../utils/security';
import { runCapturedProcess } from '../utils/process';
import { wslService } from './WslService';

export class DockerService {
  private detectedEngine: 'docker' | 'podman' | null = null;
  private targetWslDistro: string | null = null;
  private useWsl = false;
  private autoDetectedWsl = false;

  /**
   * Define manualmente a distro WSL a ser utilizada.
   * Se for null ou vazio, volta para detecção automática ou Windows host.
   */
  public setTargetWslDistro(distro: string | null): void {
    this.autoDetectedWsl = false;
    if (distro && isValidIdentifier(distro) && distro.trim().length > 0) {
      this.targetWslDistro = distro.trim();
      this.useWsl = true;
    } else {
      this.targetWslDistro = null;
      this.useWsl = false;
    }
  }

  public getTargetWslDistro(): string | null {
    return this.targetWslDistro;
  }

  public isUsingWsl(): boolean {
    return this.useWsl;
  }

  /**
   * Monta o comando executável e argumentos para rodar o Docker diretamente no Windows
   * ou repassar via `wsl -d <distro> -- docker ...`.
   */
  private async resolveCommandAndArgs(
    dockerSubcommand: string,
    args: string[] = []
  ): Promise<{ binary: string; finalArgs: string[] }> {
    if (this.useWsl && this.targetWslDistro) {
      return {
        binary: 'wsl',
        finalArgs: ['-d', this.targetWslDistro, '--', 'docker', dockerSubcommand, ...args]
      };
    }

    const engine = await this.getEngineCommand();
    return {
      binary: engine,
      finalArgs: [dockerSubcommand, ...args]
    };
  }

  /**
   * Converte um caminho estilo Windows (C:\...) para o caminho montado equivalente dentro do WSL
   * (/mnt/c/...), necessário porque o Docker CLI executando dentro de uma distro WSL não interpreta
   * letras de unidade do Windows.
   */
  private toWslPath(windowsPath: string): string {
    if (!this.useWsl || !this.targetWslDistro) return windowsPath;
    const match = /^([a-zA-Z]):[\\/](.*)$/.exec(windowsPath);
    if (!match) return windowsPath;
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, '/');
    return `/mnt/${drive}/${rest}`;
  }

  /**
   * Identifica e retorna o comando do motor de container disponível no Windows ('docker' ou 'podman').
   */
  public async getEngineCommand(): Promise<'docker' | 'podman'> {
    if (this.detectedEngine) {
      return this.detectedEngine;
    }

    // Testa primeiro o Docker no Windows
    try {
      await execFileAsync('docker', ['--version'], { timeout: 3000, windowsHide: true });
      this.detectedEngine = 'docker';
      return 'docker';
    } catch {
      try {
        await execFileAsync('podman', ['--version'], { timeout: 3000, windowsHide: true });
        this.detectedEngine = 'podman';
        return 'podman';
      } catch {
        return 'docker';
      }
    }
  }

  public setEngineCommand(engine: 'docker' | 'podman' | null): void {
    this.detectedEngine = engine;
  }

  /**
   * Verifica se o executável do Docker ou Podman está ativo no sistema ou dentro de uma distro WSL.
   */
  public async checkDockerStatus(): Promise<DockerDaemonStatus> {
    const availableDistros = await wslService.listDistros();

    // 1. Se uma distro WSL específica foi selecionada manualmente pelo usuário (não apenas detectada
    // automaticamente como fallback), respeita a escolha sem voltar a testar o host Windows.
    if (this.useWsl && this.targetWslDistro && !this.autoDetectedWsl) {
      try {
        const { stdout } = await execFileAsync(
          'wsl',
          ['-d', this.targetWslDistro, '--', 'docker', 'version', '--format', '{{.Server.Version}}'],
          { timeout: 5000, windowsHide: true }
        );
        const version = stdout.trim();
        const wslIp = await wslService.getDistroIp(this.targetWslDistro);
        return {
          installed: true,
          running: true,
          engine: 'docker',
          version: version ? `Docker (WSL: ${this.targetWslDistro}) v${version}` : `Docker WSL (${this.targetWslDistro})`,
          isWsl: true,
          wslDistro: this.targetWslDistro,
          wslIp,
          availableDistros
        };
      } catch {
        const wslIp = await wslService.getDistroIp(this.targetWslDistro);
        return {
          installed: true,
          running: false,
          engine: 'docker',
          isWsl: true,
          wslDistro: this.targetWslDistro,
          wslIp,
          availableDistros,
          error: `Docker não está respondendo dentro da distro WSL "${this.targetWslDistro}". Certifique-se de que o daemon está em execução (dockerd/service docker start).`
        };
      }
    }

    // 2. Tentar Docker diretamente no Windows Host primeiro
    try {
      const { stdout } = await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], {
        timeout: 4000,
        windowsHide: true
      });
      const version = stdout.trim();
      this.detectedEngine = 'docker';
      this.useWsl = false;
      this.autoDetectedWsl = false;
      return {
        installed: true,
        running: true,
        engine: 'docker',
        version: version || 'Docker Host Ativo',
        isWsl: false,
        availableDistros
      };
    } catch {
      // 3. Se falhou no Windows Host, verificar Podman no Windows
      try {
        const { stdout } = await execFileAsync('podman', ['version', '--format', '{{.Server.Version}}'], {
          timeout: 4000,
          windowsHide: true
        });
        const version = stdout.trim();
        this.detectedEngine = 'podman';
        this.useWsl = false;
        this.autoDetectedWsl = false;
        return {
          installed: true,
          running: true,
          engine: 'podman',
          version: version || 'Podman Host Ativo',
          isWsl: false,
          availableDistros
        };
      } catch {
        // 4. Windows não tem Docker/Podman rodando. Verificar se há Docker dentro de alguma distro WSL 2!
        const wslDistroWithDocker = await wslService.findDockerWslDistro();
        if (wslDistroWithDocker) {
          this.targetWslDistro = wslDistroWithDocker;
          this.useWsl = true;
          this.autoDetectedWsl = true;

          try {
            const { stdout } = await execFileAsync(
              'wsl',
              ['-d', wslDistroWithDocker, '--', 'docker', 'version', '--format', '{{.Server.Version}}'],
              { timeout: 5000, windowsHide: true }
            );
            const version = stdout.trim();
            const wslIp = await wslService.getDistroIp(wslDistroWithDocker);
            return {
              installed: true,
              running: true,
              engine: 'docker',
              version: version ? `Docker (WSL: ${wslDistroWithDocker}) v${version}` : `Docker WSL (${wslDistroWithDocker})`,
              isWsl: true,
              wslDistro: wslDistroWithDocker,
              wslIp,
              availableDistros
            };
          } catch {
            const wslIp = await wslService.getDistroIp(wslDistroWithDocker);
            return {
              installed: true,
              running: false,
              engine: 'docker',
              isWsl: true,
              wslDistro: wslDistroWithDocker,
              wslIp,
              availableDistros,
              error: `Encontrada distro WSL "${wslDistroWithDocker}", mas o daemon do Docker não está ativo.`
            };
          }
        }

        // Nenhum motor está respondendo — verifica se ao menos o binário está instalado no Windows,
        // para diferenciar "não instalado" de "instalado, porém com o serviço parado".
        let anyBinaryInstalled = false;
        try {
          await execFileAsync('docker', ['--version'], { timeout: 3000, windowsHide: true });
          anyBinaryInstalled = true;
        } catch {
          try {
            await execFileAsync('podman', ['--version'], { timeout: 3000, windowsHide: true });
            anyBinaryInstalled = true;
          } catch {
            // Nenhum binário encontrado no Windows
          }
        }

        return {
          installed: anyBinaryInstalled,
          running: false,
          availableDistros,
          error: anyBinaryInstalled
            ? 'Docker/Podman está instalado, mas o serviço não está em execução. Inicie o Docker Desktop ou o daemon correspondente.'
            : 'Nenhum motor de containers (Docker/Podman no Windows ou Docker no WSL) foi encontrado em execução.'
        };
      }
    }
  }

  /**
   * Garante que o motor Docker esteja em execução.
   * Se uma distro WSL estiver configurada e o daemon estiver offline,
   * tenta auto-inicializar o serviço dockerd automaticamente.
   */
  public async ensureDockerRunning(distroOverride?: string): Promise<{ running: boolean; error?: string }> {
    const targetDistro = distroOverride || (this.useWsl ? this.targetWslDistro : null);

    if (targetDistro) {
      const isAlreadyRunning = await wslService.testDockerInDistro(targetDistro);
      if (isAlreadyRunning) {
        return { running: true };
      }

      console.log(`[DockerService] Auto-healing: iniciando daemon Docker na distro WSL "${targetDistro}"...`);
      const startRes = await wslService.startDockerDaemon(targetDistro);
      if (startRes.success) {
        return { running: true };
      }
      return {
        running: false,
        error: startRes.message || `O Docker daemon está inativo na distro WSL "${targetDistro}".`
      };
    }

    const currentStatus = await this.checkDockerStatus();
    if (currentStatus.running) return { running: true };

    if (currentStatus.isWsl && currentStatus.wslDistro) {
      const startRes = await wslService.startDockerDaemon(currentStatus.wslDistro);
      if (startRes.success) return { running: true };
      return { running: false, error: startRes.message };
    }

    return {
      running: false,
      error: currentStatus.error || 'Motor de containers Docker/Podman offline.'
    };
  }

  /**
   * Lista todos os containers locais (em execução e parados).
   */
  public async listContainers(): Promise<DockerContainerInfo[]> {
    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('ps', [
        '-a',
        '--format',
        '{"id":"{{.ID}}","names":"{{.Names}}","image":"{{.Image}}","state":"{{.State}}","status":"{{.Status}}","ports":"{{.Ports}}","created":"{{.CreatedAt}}"}'
      ]);

      const { stdout } = await execFileAsync(binary, finalArgs, {
        timeout: 10000,
        windowsHide: true
      });

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
      console.warn('[DockerService] Motor de containers indisponível ou offline:', err?.message || err);
      return [];
    }
  }

  private static readonly CONTAINER_ALIASES: Record<string, string[]> = {
    'oracle-winthor': ['oracle-local', 'oracle', 'oracle-xe', 'winthor-oracle'],
    'oracle-local': ['oracle-winthor', 'oracle', 'oracle-xe', 'winthor-oracle'],
    'oracle': ['oracle-local', 'oracle-winthor', 'oracle-xe'],
    'oracle-xe': ['oracle-local', 'oracle-winthor'],
    'linux-winthor': ['wta-local', 'wta', 'wta-winthor'],
    'wta-local': ['linux-winthor', 'wta', 'wta-winthor'],
    'wta': ['wta-local', 'linux-winthor', 'wta-winthor'],
    'wta-winthor': ['wta-local', 'linux-winthor'],
    'wsh-winthor': ['wsh-local', 'wsh'],
    'wsh-local': ['wsh-winthor', 'wsh'],
    'wsh': ['wsh-local', 'wsh-winthor']
  };

  /**
   * Resolve um alias existente caso o nome de container informado não exista
   * na distro ativa, mas seu equivalente exista (ex: oracle-winthor <-> oracle-local).
   */
  public async resolveContainerAlias(targetName: string): Promise<string | null> {
    const clean = targetName.toLowerCase().trim();
    const candidates = DockerService.CONTAINER_ALIASES[clean];
    if (!candidates || candidates.length === 0) return null;

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('ps', ['-a', '--format', '{{.Names}}']);
      const { stdout } = await execFileAsync(binary, finalArgs, { timeout: 6000, windowsHide: true });
      const existingNames = stdout
        .trim()
        .split('\n')
        .map((n) => n.replace(/^\//, '').trim().toLowerCase())
        .filter(Boolean);

      for (const candidate of candidates) {
        if (existingNames.includes(candidate.toLowerCase())) {
          return candidate;
        }
      }
    } catch {
      // Ignora erro de checagem prévia
    }
    return null;
  }

  /**
   * Inicia um container existente com auto-healing caso o Docker daemon esteja desligado no WSL
   * e resolução automática de aliases (ex: oracle-winthor <-> oracle-local).
   */
  public async startContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    const runStart = async (targetId: string) => {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('start', [targetId]);
      await execFileAsync(binary, finalArgs, {
        timeout: 20000,
        windowsHide: true
      });
      return true;
    };

    try {
      return await runStart(containerId);
    } catch (err: any) {
      let currentErr = err;
      const errStr = (currentErr?.stderr || '') + ' ' + (currentErr?.message || '') + ' ' + (currentErr?.stdout || '');
      const isDaemonOffline =
        errStr.includes('Cannot connect to the Docker daemon') ||
        errStr.includes('Is the docker daemon running') ||
        errStr.includes('docker daemon is not running') ||
        errStr.includes('Failed to connect to');

      // Se o erro foi daemon offline e estamos usando WSL, tenta auto-iniciar o dockerd e retry
      if (isDaemonOffline && this.useWsl && this.targetWslDistro) {
        console.warn(`[DockerService] Daemon offline detectado ao iniciar ${containerId}. Tentando auto-healing na distro "${this.targetWslDistro}"...`);
        const heal = await wslService.startDockerDaemon(this.targetWslDistro);
        if (heal.success) {
          try {
            return await runStart(containerId);
          } catch (retryErr: any) {
            currentErr = retryErr;
          }
        } else if (heal.message) {
          throw new Error(heal.message);
        }
      }

      console.error(`[DockerService] Erro ao iniciar container ${containerId}:`, currentErr);

      const updatedErrStr = (currentErr?.stderr || '') + ' ' + (currentErr?.message || '') + ' ' + (currentErr?.stdout || '');
      if (updatedErrStr.includes('No such container')) {
        // Tenta auto-resolução de alias (ex: oracle-winthor -> oracle-local)
        const alias = await this.resolveContainerAlias(containerId);
        if (alias) {
          try {
            console.log(`[DockerService] Redirecionando alias automático: "${containerId}" -> "${alias}"`);
            return await runStart(alias);
          } catch (aliasErr: any) {
            console.warn(`[DockerService] Falha ao tentar iniciar alias "${alias}":`, aliasErr?.message);
          }
        }

        const distroMsg = this.useWsl && this.targetWslDistro ? ` na distro WSL "${this.targetWslDistro}"` : '';
        throw new Error(
          `O container "${containerId}" não foi encontrado${distroMsg}. Verifique os containers criados ou o nome informado nas configurações do ambiente.`
        );
      }

      if (isDaemonOffline) {
        const distroMsg = this.useWsl && this.targetWslDistro ? ` na distro WSL "${this.targetWslDistro}"` : '';
        throw new Error(
          `O serviço do Docker (dockerd) não está respondendo${distroMsg}. Certifique-se de que o daemon está em execução (sudo service docker start).`
        );
      }

      throw new Error(currentErr.stderr || currentErr.message || 'Falha ao iniciar container');
    }
  }

  /**
   * Para um container em execução (com suporte a resolução de aliases).
   */
  public async stopContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('stop', [containerId]);
      await execFileAsync(binary, finalArgs, {
        timeout: 25000,
        windowsHide: true
      });
      return true;
    } catch (err: any) {
      if ((err?.stderr || '').includes('No such container')) {
        const alias = await this.resolveContainerAlias(containerId);
        if (alias) {
          try {
            const { binary, finalArgs } = await this.resolveCommandAndArgs('stop', [alias]);
            await execFileAsync(binary, finalArgs, { timeout: 25000, windowsHide: true });
            return true;
          } catch {
            // Falha no alias: ignora e segue para o erro original do containerId informado
          }
        }
      }
      console.error(`[DockerService] Erro ao parar container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao parar container');
    }
  }

  /**
   * Reinicia um container (com suporte a resolução de aliases).
   */
  public async restartContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('restart', [containerId]);
      await execFileAsync(binary, finalArgs, {
        timeout: 25000,
        windowsHide: true
      });
      return true;
    } catch (err: any) {
      if ((err?.stderr || '').includes('No such container')) {
        const alias = await this.resolveContainerAlias(containerId);
        if (alias) {
          try {
            const { binary, finalArgs } = await this.resolveCommandAndArgs('restart', [alias]);
            await execFileAsync(binary, finalArgs, { timeout: 25000, windowsHide: true });
            return true;
          } catch {
            // Falha no alias: ignora e segue para o erro original do containerId informado
          }
        }
      }
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
      const { binary, finalArgs } = await this.resolveCommandAndArgs('logs', [
        '--tail',
        String(safeLines),
        '--timestamps',
        containerId
      ]);

      const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
        timeout: 12000,
        windowsHide: true,
        maxBuffer: 5 * 1024 * 1024
      });

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
      const { binary, finalArgs } = await this.resolveCommandAndArgs('rm', ['-f', containerId]);
      await execFileAsync(binary, finalArgs, {
        timeout: 20000,
        windowsHide: true
      });
      return true;
    } catch (err: any) {
      console.error(`[DockerService] Erro ao remover container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao remover container');
    }
  }

  private isValidContainerId(id: string): boolean {
    return isValidIdentifier(id) && id.trim().length >= 2 && id.trim().length <= 128;
  }

  /**
   * Executa docker inspect e retorna informações detalhadas de rede, portas, volumes e ambiente.
   */
  public async inspectContainer(containerId: string): Promise<DockerContainerInspect | null> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('inspect', [containerId]);
      const { stdout } = await execFileAsync(binary, finalArgs, {
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      });

      const parsed = JSON.parse(stdout);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      const data = parsed[0];

      const rawPorts = data.NetworkSettings?.Ports || {};
      const ports: Record<string, DockerContainerPortBinding[] | null> = {};
      for (const [key, val] of Object.entries(rawPorts)) {
        if (Array.isArray(val)) {
          ports[key] = val.map((p: any) => ({
            hostIp: p.HostIp || '0.0.0.0',
            hostPort: p.HostPort || ''
          }));
        } else {
          ports[key] = null;
        }
      }

      const mounts: DockerContainerMount[] = Array.isArray(data.Mounts)
        ? data.Mounts.map((m: any) => ({
            type: m.Type || 'volume',
            name: m.Name,
            source: m.Source || '',
            destination: m.Destination || '',
            driver: m.Driver,
            mode: m.Mode || '',
            rw: m.RW ?? true,
            propagation: m.Propagation
          }))
        : [];

      return {
        id: data.Id || containerId,
        name: (data.Name || '').replace(/^\//, ''),
        image: data.Config?.Image || data.Image || '',
        imageId: data.Image,
        created: data.Created || '',
        path: data.Path,
        args: data.Args || [],
        state: {
          status: data.State?.Status || 'unknown',
          running: !!data.State?.Running,
          paused: !!data.State?.Paused,
          restarting: !!data.State?.Restarting,
          oomKilled: data.State?.OOMKilled,
          dead: data.State?.Dead,
          pid: data.State?.Pid,
          exitCode: data.State?.ExitCode ?? 0,
          error: data.State?.Error,
          startedAt: data.State?.StartedAt || '',
          finishedAt: data.State?.FinishedAt || '',
          health: data.State?.Health ? {
            status: data.State.Health.Status,
            failingStreak: data.State.Health.FailingStreak
          } : undefined
        },
        networkSettings: {
          ipAddress: data.NetworkSettings?.IPAddress || '',
          gateway: data.NetworkSettings?.Gateway || '',
          macAddress: data.NetworkSettings?.MacAddress || '',
          ports,
          networks: data.NetworkSettings?.Networks
        },
        mounts,
        env: Array.isArray(data.Config?.Env)
          ? data.Config.Env.map((entry: string) => {
              const idx = entry.indexOf('=');
              const key = idx === -1 ? entry : entry.slice(0, idx);
              return /PASSWORD|SECRET|TOKEN|API[_-]?KEY|PWD|CREDENTIAL/i.test(key)
                ? `${key}=***REDACTED***`
                : entry;
            })
          : [],
        command: Array.isArray(data.Config?.Cmd) ? data.Config.Cmd.join(' ') : (data.Config?.Cmd || ''),
        entrypoint: Array.isArray(data.Config?.Entrypoint) ? data.Config.Entrypoint : undefined,
        cmd: Array.isArray(data.Config?.Cmd) ? data.Config.Cmd : undefined,
        platform: data.Platform || undefined,
        workingDir: data.Config?.WorkingDir || '',
        restartPolicy: data.HostConfig?.RestartPolicy ? {
          name: data.HostConfig.RestartPolicy.Name || 'no',
          maximumRetryCount: data.HostConfig.RestartPolicy.MaximumRetryCount
        } : undefined
      };
    } catch (err: any) {
      console.error(`[DockerService] Erro ao inspecionar container ${containerId}:`, err);
      return null;
    }
  }

  /**
   * Pausa um container em execução (docker pause).
   */
  public async pauseContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }
    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('pause', [containerId]);
      await execFileAsync(binary, finalArgs, { timeout: 15000, windowsHide: true });
      return true;
    } catch (err: any) {
      console.error(`[DockerService] Erro ao pausar container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao pausar container');
    }
  }

  /**
   * Despausa um container (docker unpause).
   */
  public async unpauseContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }
    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('unpause', [containerId]);
      await execFileAsync(binary, finalArgs, { timeout: 15000, windowsHide: true });
      return true;
    } catch (err: any) {
      console.error(`[DockerService] Erro ao despausar container ${containerId}:`, err);
      throw new Error(err.stderr || err.message || 'Falha ao despausar container');
    }
  }

  /**
   * Expruga containers parados (docker container prune -f).
   */
  public async pruneContainers(): Promise<{ success: boolean; output: string }> {
    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('container', ['prune', '-f']);
      const { stdout, stderr } = await execFileAsync(binary, finalArgs, { timeout: 30000, windowsHide: true });
      return { success: true, output: (stdout || stderr || 'Containers parados removidos com sucesso.').trim() };
    } catch (err: any) {
      return { success: false, output: err.stderr || err.message || 'Falha ao expurgar containers' };
    }
  }

  /**
   * Obtém as estatísticas de consumo de recursos (CPU, Memória, I/O) dos containers ativos.
   */
  public async getContainerStats(): Promise<DockerContainerStats[]> {
    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('stats', [
        '--no-stream',
        '--format',
        '{"id":"{{.ID}}","name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","memPerc":"{{.MemPerc}}","netIO":"{{.NetIO}}"}'
      ]);

      const { stdout } = await execFileAsync(binary, finalArgs, {
        timeout: 10000,
        windowsHide: true
      });

      const lines = stdout.trim().split('\n').filter((l) => l.trim().length > 0);
      const stats: DockerContainerStats[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          stats.push({
            id: parsed.id || '',
            name: parsed.name || '',
            cpu: parsed.cpu || '0%',
            mem: parsed.mem || '0B',
            memPerc: parsed.memPerc || '0%',
            netIO: parsed.netIO || '0B'
          });
        } catch {
          // Linha ignorada
        }
      }

      return stats;
    } catch {
      return [];
    }
  }

  /**
   * Abre um terminal interativo conectado ao container selecionado via Windows Terminal (`wt`) ou cmd.
   */
  public async openContainerTerminal(containerId: string, shellName = 'bash'): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    const safeShell = ['bash', 'sh', 'zsh'].includes(shellName) ? shellName : 'bash';

    try {
      if (this.useWsl && this.targetWslDistro) {
        // Tenta abrir com Windows Terminal (wt) direto na sessão bash do container
        const distro = this.targetWslDistro;
        const wtArgs = ['-w', '0', 'nt', 'wsl', '-d', distro, '--', 'docker', 'exec', '-it', containerId, safeShell];
        const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
        wtChild.on('error', () => {
          // wt.exe indisponível (ENOENT chega de forma assíncrona, não via throw): cai para cmd.exe
          const fallbackCmd = `wsl -d ${distro} -- docker exec -it ${containerId} ${safeShell}`;
          const child = spawn('cmd.exe', ['/c', 'start', `Container: ${containerId}`, 'cmd.exe', '/k', fallbackCmd], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        });
        wtChild.unref();
        return true;
      }

      const engine = await this.getEngineCommand();
      const title = `Container (${engine}): ${containerId.slice(0, 12)}`;
      const dockerArgs = `${engine} exec -it ${containerId} ${safeShell}`;

      const child = spawn('cmd.exe', ['/c', 'start', title, 'cmd.exe', '/k', dockerArgs], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.unref();
      return true;
    } catch (err) {
      console.error(`[DockerService] Falha ao abrir terminal para o container ${containerId}:`, err);
      return false;
    }
  }

  /**
   * Inicia uma sequência de containers ordenadamente respeitando delays pré-configurados
   * (ex: Oracle -> delay 60s -> WTA -> delay 20s -> WSH).
   */
  public async startContainerSequence(
    containers: { name: string; delay?: number }[],
    onProgress?: (step: { currentName: string; index: number; total: number; waitingSeconds?: number }) => void
  ): Promise<{ success: boolean; started: string[]; failed?: string; error?: string }> {
    const started: string[] = [];

    // Auto-recuperação prévia: garante que o daemon Docker esteja ativo antes de iniciar a sequência
    const ensure = await this.ensureDockerRunning();
    if (!ensure.running) {
      return {
        success: false,
        started: [],
        failed: containers[0]?.name || 'docker-daemon',
        error: ensure.error || 'O daemon do Docker está inativo e não pôde ser iniciado automaticamente.'
      };
    }

    for (let i = 0; i < containers.length; i++) {
      const item = containers[i];
      onProgress?.({ currentName: item.name, index: i + 1, total: containers.length });

      try {
        await this.startContainer(item.name);
        started.push(item.name);
      } catch (err: any) {
        return {
          success: false,
          started,
          failed: item.name,
          error: err?.message || 'Falha ao iniciar container'
        };
      }

      // Se houver delay configurado e não for o último container
      if (item.delay && item.delay > 0 && i < containers.length - 1) {
        for (let sec = item.delay; sec > 0; sec--) {
          onProgress?.({ currentName: item.name, index: i + 1, total: containers.length, waitingSeconds: sec });
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    return { success: true, started };
  }

  /**
   * Builda uma imagem de container a partir de um diretório de contexto, com saída em streaming.
   */
  public async buildImage(
    contextPath: string,
    imageTag: string,
    dockerfile: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeLocalPath(contextPath) || !fs.existsSync(contextPath)) {
      const err = `[ERRO] Diretório de contexto do container não encontrado: ${contextPath}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }
    if (!isSafeDockerImageTag(imageTag)) {
      const err = `[ERRO] Tag de imagem de container inválida: ${imageTag}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }

    const { binary, finalArgs } = await this.resolveCommandAndArgs('build', [
      '-t',
      imageTag,
      ...(dockerfile && dockerfile.trim() ? ['-f', this.toWslPath(dockerfile.trim())] : []),
      this.toWslPath(contextPath)
    ]);

    onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
    const result = await runCapturedProcess(binary, finalArgs, { cwd: contextPath, windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Imagem "${imageTag}" construída com sucesso!\r\n`
        : `\r\n[ERRO] Falha ao construir imagem "${imageTag}" (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Envia (push) uma imagem de container para o registry configurado na tag, com saída em streaming.
   */
  public async pushImage(
    imageTag: string,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeDockerImageTag(imageTag)) {
      const err = `[ERRO] Tag de imagem de container inválida: ${imageTag}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }

    const { binary, finalArgs } = await this.resolveCommandAndArgs('push', [imageTag]);
    onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);

    const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Imagem "${imageTag}" enviada com sucesso!\r\n`
        : `\r\n[ERRO] Falha ao enviar imagem "${imageTag}" (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Sobe os serviços definidos em um docker-compose.yml.
   */
  public async composeUp(
    composeFilePath: string,
    options: { profile?: string; detach?: boolean; build?: boolean } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
      const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }

    const args = ['compose', '-f', this.toWslPath(composeFilePath)];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('up');
    if (options?.detach !== false) args.push('-d');
    if (options?.build === true) args.push('--build');

    const { binary, finalArgs } = await this.resolveCommandAndArgs(args[0], args.slice(1));
    onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
    const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Serviços do compose iniciados com sucesso!\r\n`
        : `\r\n[ERRO] Falha ao subir serviços do compose (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Derruba os serviços definidos em um docker-compose.yml (com suporte a remoção de volumes com -v).
   */
  public async composeDown(
    composeFilePath: string,
    options: { profile?: string; volumes?: boolean } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
      const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }

    const args = ['compose', '-f', this.toWslPath(composeFilePath)];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('down');
    if (options?.volumes === true) {
      args.push('-v');
    }

    const { binary, finalArgs } = await this.resolveCommandAndArgs(args[0], args.slice(1));
    onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
    const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Serviços do compose derrubados!\r\n`
        : `\r\n[ERRO] Falha ao derrubar serviços do compose (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Reinicia os serviços definidos em um docker-compose.yml.
   */
  public async composeRestart(
    composeFilePath: string,
    options: { profile?: string } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
      const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }

    const args = ['compose', '-f', this.toWslPath(composeFilePath)];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('restart');

    const { binary, finalArgs } = await this.resolveCommandAndArgs(args[0], args.slice(1));
    onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
    const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Serviços do compose reiniciados com sucesso!\r\n`
        : `\r\n[ERRO] Falha ao reiniciar serviços do compose (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Obtém os logs agregados dos serviços do docker-compose.yml.
   */
  public async getComposeLogs(
    composeFilePath: string,
    options?: { profile?: string; lines?: number }
  ): Promise<string> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
      return 'Arquivo docker-compose não encontrado.';
    }

    const lines = Math.min(Math.max(options?.lines || 200, 10), 1000);
    const args = ['compose', '-f', this.toWslPath(composeFilePath)];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('logs', '--tail', String(lines));

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs(args[0], args.slice(1));
      const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
        timeout: 15000,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      });
      return stdout || stderr || '(Sem logs no momento)';
    } catch (err: any) {
      return err.stderr || err.stdout || `Erro ao obter logs do compose: ${err.message}`;
    }
  }

  /**
   * Lista o status dos serviços de um docker-compose.yml.
   */
  public async composeStatus(composeFilePath: string, profile?: string): Promise<ComposeServiceStatus[]> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) return [];

    try {
      const args = ['compose', '-f', this.toWslPath(composeFilePath)];
      if (profile && isValidIdentifier(profile)) args.push('--profile', profile);
      args.push('ps', '--format', 'json');

      const { binary, finalArgs } = await this.resolveCommandAndArgs(args[0], args.slice(1));
      const { stdout } = await execFileAsync(binary, finalArgs, { timeout: 8000, windowsHide: true });
      const lines = stdout.trim().split('\n').filter((l) => l.trim().length > 0);
      const services: ComposeServiceStatus[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const publishers = Array.isArray(parsed.Publishers) ? parsed.Publishers : [];
          services.push({
            name: parsed.Service || parsed.Name || '',
            state: parsed.State || parsed.Status || 'unknown',
            health: parsed.Health || undefined,
            ports: publishers.length > 0
              ? publishers.map((p: any) => `${p.PublishedPort || ''}:${p.TargetPort || ''}`)
              : undefined
          });
        } catch {
          // Ignora linha inválida
        }
      }

      return services;
    } catch {
      return [];
    }
  }

  /**
   * Executa a ferramenta de diagnóstico ou autocorreção do Oracle Database (db_health.sh).
   * Script localizado dentro do container em /home/oracle/tools/db_health.sh.
   */
  public async execOracleHealth(
    containerName: string,
    schema?: string,
    fix = false,
    user = 'sys',
    password?: string
  ): Promise<OracleMaintenanceResult> {
    if (!password) {
      return { success: false, output: '', error: 'Senha do usuário Oracle (sys/system) é obrigatória.' };
    }
    const cleanContainer = containerName.replace(/^\//, '');
    const cleanUser = user.replace(/[^a-zA-Z0-9_]/g, '') || 'sys';
    const cleanPass = password;
    const cleanSchema = schema ? schema.trim().toUpperCase().replace(/[^a-zA-Z0-9_]/g, '') : '';

    const args = ['exec', '-i', cleanContainer, '/home/oracle/tools/db_health.sh', cleanUser, cleanPass];
    if (cleanSchema) {
      args.push(cleanSchema);
    }
    if (fix) {
      args.push('--fix');
    }

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs(args[0], args.slice(1));
      const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
        timeout: 180000, // 3 min (recompilação de objetos pode demorar)
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      });

      return {
        success: true,
        output: (stdout + '\n' + (stderr || '')).trim()
      };
    } catch (err: any) {
      return {
        success: false,
        output: (err?.stdout || '') + '\n' + (err?.stderr || ''),
        error: err?.message || String(err),
        exitCode: err?.code
      };
    }
  }

  /**
   * Abre um terminal interativo executando sqlplus_conn.sh dentro do container Oracle.
   */
  public async openOracleSqlPlus(
    containerName: string,
    user = 'sys',
    password?: string
  ): Promise<boolean> {
    const cleanContainer = containerName.replace(/^\//, '');
    if (!this.isValidContainerId(cleanContainer)) {
      throw new Error('Identificador de container inválido.');
    }
    if (!password) {
      throw new Error('Senha do usuário Oracle (sys/system) é obrigatória.');
    }
    const cleanUser = user.replace(/[^a-zA-Z0-9_]/g, '') || 'sys';
    const cleanPass = password.replace(/[^a-zA-Z0-9_!@#%^*+=.-]/g, '');

    const cmdInside = `/home/oracle/tools/sqlplus_conn.sh ${cleanUser} ${cleanPass}`;

    try {
      if (this.useWsl && this.targetWslDistro) {
        const distro = this.targetWslDistro;
        const wtArgs = [
          '-w', '0', 'nt',
          '--title', `Oracle SQL*Plus: ${cleanContainer} (${cleanUser})`,
          'wsl.exe', '-d', distro, '--',
          'docker', 'exec', '-it', cleanContainer, 'bash', '-c', cmdInside
        ];

        const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
        wtChild.on('error', () => {
          const fallbackCmd = `wsl -d ${distro} -- docker exec -it ${cleanContainer} bash -c "${cmdInside}"`;
          const child = spawn('cmd.exe', ['/c', 'start', `SQL*Plus ${cleanContainer}`, 'cmd.exe', '/k', fallbackCmd], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        });
        wtChild.unref();
        return true;
      }

      const engine = await this.getEngineCommand();
      const dockerArgs = `${engine} exec -it ${cleanContainer} bash -c "${cmdInside}"`;
      const child = spawn('cmd.exe', ['/c', 'start', `SQL*Plus ${cleanContainer}`, 'cmd.exe', '/k', dockerArgs], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.unref();
      return true;
    } catch (err) {
      console.error(`[DockerService] Falha ao abrir SQL*Plus no container ${cleanContainer}:`, err);
      return false;
    }
  }

  /**
   * Abre um terminal interativo com o console de cliente Karaf (/opt/pcsist/apache-karaf/bin/client) no container WTA.
   */
  public async openWtaKarafClient(containerName: string): Promise<boolean> {
    const cleanContainer = containerName.replace(/^\//, '');
    if (!this.isValidContainerId(cleanContainer)) {
      throw new Error('Identificador de container inválido.');
    }

    const clientCmd =
      'if [ -x /opt/pcsist/apache-karaf/bin/client ]; then /opt/pcsist/apache-karaf/bin/client; elif [ -x /opt/karaf/bin/client ]; then /opt/karaf/bin/client; else bash; fi';

    try {
      if (this.useWsl && this.targetWslDistro) {
        const distro = this.targetWslDistro;
        const wtArgs = [
          '-w', '0', 'nt',
          '--title', `WTA Karaf Client: ${cleanContainer}`,
          'wsl.exe', '-d', distro, '--',
          'docker', 'exec', '-it', cleanContainer, 'bash', '-c', clientCmd
        ];

        const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
        wtChild.on('error', () => {
          const fallbackCmd = `wsl -d ${distro} -- docker exec -it ${cleanContainer} bash -c "${clientCmd}"`;
          const child = spawn('cmd.exe', ['/c', 'start', `Karaf ${cleanContainer}`, 'cmd.exe', '/k', fallbackCmd], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        });
        wtChild.unref();
        return true;
      }

      const engine = await this.getEngineCommand();
      const dockerArgs = `${engine} exec -it ${cleanContainer} bash -c "${clientCmd}"`;
      const child = spawn('cmd.exe', ['/c', 'start', `Karaf ${cleanContainer}`, 'cmd.exe', '/k', dockerArgs], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.unref();
      return true;
    } catch (err) {
      console.error(`[DockerService] Falha ao abrir Karaf client no container ${cleanContainer}:`, err);
      return false;
    }
  }

  /**
   * Executa import_dump.sh para importar e calibrar um dump no banco Oracle.
   */
  public async execOracleDataPump(params: OracleDataPumpParams): Promise<OracleMaintenanceResult> {
    if (!params?.containerName || !params?.dumpfile || !params?.schemaOrig) {
      return {
        success: false,
        output: '',
        error: 'Parâmetros obrigatórios ausentes: containerName, dumpfile ou schemaOrig.'
      };
    }
    if (!params.password) {
      return { success: false, output: '', error: 'Senha do usuário Oracle (sys/system) é obrigatória.' };
    }

    const cleanContainer = params.containerName.replace(/^\//, '');
    const cleanUser = (params.user || 'system').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanPass = params.password;
    const cleanDumpfile = params.dumpfile.replace(/[^a-zA-Z0-9_.-]/g, '');
    const cleanOrig = params.schemaOrig.toUpperCase().replace(/[^a-zA-Z0-9_]/g, '');
    const cleanDest = params.schemaDest ? params.schemaDest.toUpperCase().replace(/[^a-zA-Z0-9_]/g, '') : '';
    const rawCodcli =
      params.codclipc !== undefined && params.codclipc !== null && String(params.codclipc).trim() !== ''
        ? String(params.codclipc).trim()
        : '-999';
    const cleanCodcli = /^-?[0-9]+$/.test(rawCodcli) ? rawCodcli : '-999';

    if (!cleanDumpfile || !cleanOrig || !cleanCodcli) {
      return {
        success: false,
        output: '',
        error: 'Parâmetros obrigatórios ausentes: dumpfile, schemaOrig ou codclipc.'
      };
    }

    const scriptCmd =
      'if [ -x /home/oracle/tools/import_dump.sh ]; then exec /home/oracle/tools/import_dump.sh "$@"; else exec import_dump.sh "$@"; fi';
    const scriptArgs = [cleanUser, cleanPass, cleanDumpfile, cleanOrig];
    if (cleanDest && cleanDest !== cleanOrig) {
      scriptArgs.push(cleanDest);
    }
    scriptArgs.push(cleanCodcli);

    const args = [
      'exec',
      '-i',
      cleanContainer,
      'bash',
      '-c',
      scriptCmd,
      'bash',
      ...scriptArgs
    ];

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs(args[0], args.slice(1));
      const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
        timeout: 600000, // 10 min para dumps grandes
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024
      });

      return {
        success: true,
        output: (stdout + '\n' + (stderr || '')).trim()
      };
    } catch (err: any) {
      return {
        success: false,
        output: (err?.stdout || '') + '\n' + (err?.stderr || ''),
        error: err?.message || String(err),
        exitCode: err?.code
      };
    }
  }
}

export const ContainerService = DockerService;
