import fs from 'fs';
import { spawn } from 'child_process';
import {
  DockerContainerInfo,
  DockerDaemonStatus,
  DockerContainerStats,
  ComposeServiceStatus,
  WslDistroInfo,
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

  /**
   * Define manualmente a distro WSL a ser utilizada.
   * Se for null ou vazio, volta para detecção automática ou Windows host.
   */
  public setTargetWslDistro(distro: string | null): void {
    if (distro && distro.trim().length > 0) {
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

    // 1. Se uma distro WSL específica já foi selecionada pelo usuário ou detectada previamente
    if (this.useWsl && this.targetWslDistro) {
      try {
        const { stdout } = await execFileAsync(
          'wsl',
          ['-d', this.targetWslDistro, '--', 'docker', 'version', '--format', '{{.Server.Version}}'],
          { timeout: 5000, windowsHide: true }
        );
        const version = stdout.trim();
        return {
          installed: true,
          running: true,
          engine: 'docker',
          version: version ? `Docker (WSL: ${this.targetWslDistro}) v${version}` : `Docker WSL (${this.targetWslDistro})`,
          isWsl: true,
          wslDistro: this.targetWslDistro,
          availableDistros
        };
      } catch (err: any) {
        return {
          installed: true,
          running: false,
          engine: 'docker',
          isWsl: true,
          wslDistro: this.targetWslDistro,
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

          try {
            const { stdout } = await execFileAsync(
              'wsl',
              ['-d', wslDistroWithDocker, '--', 'docker', 'version', '--format', '{{.Server.Version}}'],
              { timeout: 5000, windowsHide: true }
            );
            const version = stdout.trim();
            return {
              installed: true,
              running: true,
              engine: 'docker',
              version: version ? `Docker (WSL: ${wslDistroWithDocker}) v${version}` : `Docker WSL (${wslDistroWithDocker})`,
              isWsl: true,
              wslDistro: wslDistroWithDocker,
              availableDistros
            };
          } catch {
            return {
              installed: true,
              running: false,
              engine: 'docker',
              isWsl: true,
              wslDistro: wslDistroWithDocker,
              availableDistros,
              error: `Encontrada distro WSL "${wslDistroWithDocker}", mas o daemon do Docker não está ativo.`
            };
          }
        }

        return {
          installed: false,
          running: false,
          availableDistros,
          error: 'Nenhum motor de containers (Docker/Podman no Windows ou Docker no WSL) foi encontrado em execução.'
        };
      }
    }
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

  /**
   * Inicia um container existente.
   */
  public async startContainer(containerId: string): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    try {
      const { binary, finalArgs } = await this.resolveCommandAndArgs('start', [containerId]);
      await execFileAsync(binary, finalArgs, {
        timeout: 20000,
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
      const { binary, finalArgs } = await this.resolveCommandAndArgs('stop', [containerId]);
      await execFileAsync(binary, finalArgs, {
        timeout: 25000,
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
      const { binary, finalArgs } = await this.resolveCommandAndArgs('restart', [containerId]);
      await execFileAsync(binary, finalArgs, {
        timeout: 25000,
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
        const wtArgs = ['-w', '0', 'nt', 'wsl', '-d', this.targetWslDistro, '--', 'docker', 'exec', '-it', containerId, safeShell];
        try {
          const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
          wtChild.unref();
          return true;
        } catch {
          // Fallback para cmd.exe
          const fallbackCmd = `wsl -d ${this.targetWslDistro} -- docker exec -it ${containerId} ${safeShell}`;
          const child = spawn('cmd.exe', ['/c', 'start', `Container: ${containerId}`, 'cmd.exe', '/k', fallbackCmd], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
          return true;
        }
      }

      const engine = await this.getEngineCommand();
      const title = `Container (${engine}): ${containerId.slice(0, 12)}`;
      const dockerArgs = `${engine} exec -it ${containerId} ${safeShell}`;

      const child = spawn('cmd.exe', ['/c', 'start', `"${title}"`, 'cmd.exe', '/k', dockerArgs], {
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
      ...(dockerfile && dockerfile.trim() ? ['-f', dockerfile.trim()] : []),
      contextPath
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
    options: { profile?: string; detach?: boolean } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
      const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }

    const args = ['compose', '-f', composeFilePath];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('up');
    if (options?.detach !== false) args.push('-d');

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
   * Derruba os serviços definidos em um docker-compose.yml.
   */
  public async composeDown(
    composeFilePath: string,
    options: { profile?: string } | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
      const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
      onChunk(err);
      return { code: 1, stdout: '', stderr: err };
    }

    const args = ['compose', '-f', composeFilePath];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('down');

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
   * Lista o status dos serviços de um docker-compose.yml.
   */
  public async composeStatus(composeFilePath: string, profile?: string): Promise<ComposeServiceStatus[]> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) return [];

    try {
      const args = ['compose', '-f', composeFilePath];
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
    password = 'password'
  ): Promise<OracleMaintenanceResult> {
    const cleanContainer = containerName.replace(/^\//, '');
    const cleanUser = user.replace(/[^a-zA-Z0-9_]/g, '') || 'sys';
    const cleanPass = password || 'password';
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
    password = 'password'
  ): Promise<boolean> {
    const cleanContainer = containerName.replace(/^\//, '');
    const cleanUser = user.replace(/[^a-zA-Z0-9_]/g, '') || 'sys';
    const cleanPass = password || 'password';

    const cmdInside = `/home/oracle/tools/sqlplus_conn.sh ${cleanUser} ${cleanPass}`;

    try {
      if (this.useWsl && this.targetWslDistro) {
        const wtArgs = [
          '-w', '0', 'nt',
          '--title', `Oracle SQL*Plus: ${cleanContainer} (${cleanUser})`,
          'wsl.exe', '-d', this.targetWslDistro, '--',
          'docker', 'exec', '-it', cleanContainer, 'bash', '-c', cmdInside
        ];

        try {
          const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
          wtChild.unref();
          return true;
        } catch {
          const fallbackCmd = `wsl -d ${this.targetWslDistro} -- docker exec -it ${cleanContainer} bash -c "${cmdInside}"`;
          const child = spawn('cmd.exe', ['/c', 'start', `SQL*Plus ${cleanContainer}`, 'cmd.exe', '/k', fallbackCmd], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
          return true;
        }
      }

      const engine = await this.getEngineCommand();
      const dockerArgs = `${engine} exec -it ${cleanContainer} bash -c "${cmdInside}"`;
      const child = spawn('cmd.exe', ['/c', 'start', `"SQL*Plus ${cleanContainer}"`, 'cmd.exe', '/k', dockerArgs], {
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
   * Executa import_dump.sh para importar e calibrar um dump no banco Oracle.
   */
  public async execOracleDataPump(params: OracleDataPumpParams): Promise<OracleMaintenanceResult> {
    const cleanContainer = params.containerName.replace(/^\//, '');
    const cleanUser = (params.user || 'system').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanPass = params.password || 'password';
    const cleanDumpfile = params.dumpfile.replace(/[^a-zA-Z0-9_.-]/g, '');
    const cleanOrig = params.schemaOrig.toUpperCase().replace(/[^a-zA-Z0-9_]/g, '');
    const cleanDest = params.schemaDest ? params.schemaDest.toUpperCase().replace(/[^a-zA-Z0-9_]/g, '') : '';
    const cleanCodcli = (params.codclipc || '9999').replace(/[^0-9]/g, '');

    if (!cleanDumpfile || !cleanOrig || !cleanCodcli) {
      return {
        success: false,
        output: '',
        error: 'Parâmetros obrigatórios ausentes: dumpfile, schemaOrig ou codclipc.'
      };
    }

    const args = [
      'exec',
      '-i',
      cleanContainer,
      '/home/oracle/tools/import_dump.sh',
      cleanUser,
      cleanPass,
      cleanDumpfile,
      cleanOrig
    ];

    if (cleanDest && cleanDest !== cleanOrig) {
      args.push(cleanDest);
    }
    args.push(cleanCodcli);

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
