import fs from 'fs';
import { spawn } from 'child_process';
import { DockerContainerInfo, DockerDaemonStatus, DockerContainerStats, ComposeServiceStatus } from '../../shared/types';
import { execFileAsync, isValidIdentifier, isSafeDockerImageTag, isSafeLocalPath } from '../utils/security';
import { runCapturedProcess } from '../utils/process';

export class DockerService {
  private detectedEngine: 'docker' | 'podman' | null = null;

  /**
   * Identifica e retorna o comando do motor de container disponível ('docker' ou 'podman').
   * Permite operação transparente em redes corporativas com restrição ao Docker Desktop.
   */
  public async getEngineCommand(): Promise<'docker' | 'podman'> {
    if (this.detectedEngine) {
      return this.detectedEngine;
    }

    // Testa primeiro o Docker
    try {
      await execFileAsync('docker', ['--version'], { timeout: 3000, windowsHide: true });
      this.detectedEngine = 'docker';
      return 'docker';
    } catch {
      // Se docker falhar ou não estiver no PATH, tenta podman
      try {
        await execFileAsync('podman', ['--version'], { timeout: 3000, windowsHide: true });
        this.detectedEngine = 'podman';
        return 'podman';
      } catch {
        return 'docker';
      }
    }
  }

  /**
   * Força a definição do comando de engine (útil para testes ou configurações customizadas).
   */
  public setEngineCommand(engine: 'docker' | 'podman' | null): void {
    this.detectedEngine = engine;
  }

  /**
   * Verifica se o executável do Docker ou Podman está instalado no sistema e se o serviço está em execução.
   */
  public async checkDockerStatus(): Promise<DockerDaemonStatus> {
    // 1. Tentar Docker primeiro
    try {
      const { stdout } = await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], {
        timeout: 5000,
        windowsHide: true
      });

      const version = stdout.trim();
      this.detectedEngine = 'docker';
      return {
        installed: true,
        running: true,
        engine: 'docker',
        version: version || 'Docker Ativo'
      };
    } catch (dockerErr: any) {
      // 2. Se Docker falhou ou não existe, tentar Podman (comum em redes corporativas restritas)
      try {
        const { stdout } = await execFileAsync('podman', ['version', '--format', '{{.Server.Version}}'], {
          timeout: 5000,
          windowsHide: true
        });

        const version = stdout.trim();
        this.detectedEngine = 'podman';
        return {
          installed: true,
          running: true,
          engine: 'podman',
          version: version || 'Podman Ativo'
        };
      } catch (podmanErr: any) {
        // Verificar se ao menos o binário de um deles está presente
        let hasDockerBinary = false;
        let hasPodmanBinary = false;

        try {
          await execFileAsync('docker', ['--version'], { timeout: 2000, windowsHide: true });
          hasDockerBinary = true;
        } catch {}

        try {
          await execFileAsync('podman', ['--version'], { timeout: 2000, windowsHide: true });
          hasPodmanBinary = true;
        } catch {}

        if (hasDockerBinary || hasPodmanBinary) {
          const engineName = hasPodmanBinary && !hasDockerBinary ? 'Podman' : 'Docker';
          this.detectedEngine = hasPodmanBinary && !hasDockerBinary ? 'podman' : 'docker';
          return {
            installed: true,
            running: false,
            engine: this.detectedEngine,
            error: `O serviço de containers (${engineName}) não está em execução. Inicie o serviço ou daemon local.`
          };
        }

        return {
          installed: false,
          running: false,
          error: 'Nenhum motor de containers (Docker ou Podman) foi encontrado no PATH do sistema.'
        };
      }
    }
  }

  /**
   * Lista todos os containers locais (em execução e parados).
   */
  public async listContainers(): Promise<DockerContainerInfo[]> {
    try {
      const engine = await this.getEngineCommand();
      const { stdout } = await execFileAsync(
        engine,
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
      const msg = String(err?.message || '');
      if (err?.code === 'ENOENT' || msg.includes('ENOENT')) {
        // Engine não está instalada ou não está no PATH
        return [];
      }
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
      const engine = await this.getEngineCommand();
      await execFileAsync(engine, ['start', containerId], {
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
      const engine = await this.getEngineCommand();
      await execFileAsync(engine, ['stop', containerId], {
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
      const engine = await this.getEngineCommand();
      await execFileAsync(engine, ['restart', containerId], {
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
      const engine = await this.getEngineCommand();
      const { stdout, stderr } = await execFileAsync(
        engine,
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
      const engine = await this.getEngineCommand();
      await execFileAsync(engine, ['rm', '-f', containerId], {
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
    return isValidIdentifier(id) && id.trim().length >= 2 && id.trim().length <= 128;
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

    const engine = await this.getEngineCommand();
    const args = ['build', '-t', imageTag];
    if (dockerfile && dockerfile.trim()) {
      args.push('-f', dockerfile.trim());
    }
    args.push(contextPath);

    onChunk(`> ${engine} ${args.join(' ')}\r\n\r\n`);

    const result = await runCapturedProcess(engine, args, { cwd: contextPath, windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Imagem "${imageTag}" construída com sucesso via ${engine}!\r\n`
        : `\r\n[ERRO] Falha ao construir imagem "${imageTag}" via ${engine} (Código ${result.code}).\r\n`
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

    const engine = await this.getEngineCommand();
    onChunk(`> ${engine} push ${imageTag}\r\n\r\n`);

    const result = await runCapturedProcess(engine, ['push', imageTag], { windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Imagem "${imageTag}" enviada com sucesso via ${engine}!\r\n`
        : `\r\n[ERRO] Falha ao enviar imagem "${imageTag}" via ${engine} (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Obtém as estatísticas de consumo de recursos (CPU, Memória, I/O) dos containers ativos.
   */
  public async getContainerStats(): Promise<DockerContainerStats[]> {
    try {
      const engine = await this.getEngineCommand();
      const { stdout } = await execFileAsync(
        engine,
        ['stats', '--no-stream', '--format', '{"id":"{{.ID}}","name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","memPerc":"{{.MemPerc}}","netIO":"{{.NetIO}}"}'],
        {
          timeout: 8000,
          windowsHide: true
        }
      );

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
   * Abre um terminal interativo conectado ao container selecionado.
   */
  public async openContainerTerminal(containerId: string, shellName = 'sh'): Promise<boolean> {
    if (!this.isValidContainerId(containerId)) {
      throw new Error('Identificador de container inválido.');
    }

    const safeShell = ['bash', 'sh', 'zsh', 'powershell', 'cmd'].includes(shellName) ? shellName : 'sh';

    try {
      const engine = await this.getEngineCommand();
      const title = `Container (${engine}): ${containerId.slice(0, 12)}`;
      const dockerArgs = `${engine} exec -it ${containerId} ${safeShell}`;

      const child = spawn(
        'cmd.exe',
        ['/c', 'start', `"${title}"`, 'cmd.exe', '/k', dockerArgs],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: false
        }
      );
      child.unref();
      return true;
    } catch (err) {
      console.error(`[DockerService] Falha ao abrir terminal para o container ${containerId}:`, err);
      return false;
    }
  }

  /**
   * Sobe os serviços definidos em um docker-compose.yml, com saída em streaming.
   * `profile` corresponde a --profile (ex: "full-stack", "services", ver docker-compose.yml do repo).
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

    const engine = await this.getEngineCommand();
    const args = ['compose', '-f', composeFilePath];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('up');
    if (options?.detach !== false) args.push('-d');

    onChunk(`> ${engine} ${args.join(' ')}\r\n\r\n`);
    const result = await runCapturedProcess(engine, args, { windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Serviços do compose iniciados via ${engine}!\r\n`
        : `\r\n[ERRO] Falha ao subir serviços do compose via ${engine} (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Derruba os serviços definidos em um docker-compose.yml, com saída em streaming.
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

    const engine = await this.getEngineCommand();
    const args = ['compose', '-f', composeFilePath];
    if (options?.profile && isValidIdentifier(options.profile)) {
      args.push('--profile', options.profile);
    }
    args.push('down');

    onChunk(`> ${engine} ${args.join(' ')}\r\n\r\n`);
    const result = await runCapturedProcess(engine, args, { windowsHide: true }, onChunk);
    onChunk(
      result.code === 0
        ? `\r\n[SUCESSO] Serviços do compose derrubados via ${engine}!\r\n`
        : `\r\n[ERRO] Falha ao derrubar serviços do compose via ${engine} (Código ${result.code}).\r\n`
    );
    return result;
  }

  /**
   * Lista o status dos serviços de um docker-compose.yml (equivalente a `docker compose ps`).
   */
  public async composeStatus(composeFilePath: string, profile?: string): Promise<ComposeServiceStatus[]> {
    if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) return [];

    try {
      const engine = await this.getEngineCommand();
      const args = ['compose', '-f', composeFilePath];
      if (profile && isValidIdentifier(profile)) args.push('--profile', profile);
      args.push('ps', '--format', 'json');

      const { stdout } = await execFileAsync(engine, args, { timeout: 8000, windowsHide: true });
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
          // Ignora linha com parse inválido
        }
      }

      return services;
    } catch {
      return [];
    }
  }
}

export const ContainerService = DockerService;
