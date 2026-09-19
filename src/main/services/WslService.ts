import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { exec, spawn } from 'child_process';
import {
  WslDistroInfo,
  ContainerEnvironment,
  ContainerEnvironmentSlot,
  WslActionResult,
  WslDumpFileInfo,
  WshPrerequisiteStatus,
  WslSnapshotFileInfo,
  WslSnapshotActionResult,
  InfrDockerScriptStatus
} from '../../shared/types';
import { execFileAsync, isValidIdentifier } from '../utils/security';

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
      const { stdout } = await execFileAsync('wsl.exe', ['-d', distroName, '--', 'docker', 'version', '--format', '{{.Server.Version}}'], {
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
      let autoIdCounter = 0;

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
            id: env.id || `${Date.now()}-${autoIdCounter++}`,
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

  /**
   * Inicia o daemon do Docker (dockerd) dentro de uma distro WSL específica através de pipeline multi-tier resiliente:
   * 1. Limpeza de locks obsoletos (/var/run/docker.pid, /var/run/docker.sock)
   * 2. Verificação de binários instalados (dockerd, /etc/init.d/docker)
   * 3. Tier 1: SysVinit direto (/etc/init.d/docker start) — ideal para WSL2 sem systemd
   * 4. Tier 2: Service wrapper (service docker start)
   * 5. Tier 3: Systemctl (systemctl start docker) — somente se systemd estiver ativo
   * 6. Tier 4: Spawn direto dockerd via nohup com ajuste de iptables-legacy
   * 7. Ajuste de permissões do socket (chmod 666 /var/run/docker.sock)
   * 8. Diagnóstico detalhado com captura de /tmp/docker-start.log
   */
  public async startDockerDaemon(distroName: string): Promise<WslActionResult> {
    if (!distroName || !isValidIdentifier(distroName)) {
      return { success: false, message: 'Nome da distribuição WSL inválido.' };
    }

    // 1. Checa se o Docker já está ativo
    if (await this.testDockerInDistro(distroName)) {
      return { success: true, message: `Docker já está em execução na distro "${distroName}".` };
    }

    try {
      // Script bash auto-contido e resiliente executado como root na distro
      const startupScript = [
        'LOG="/tmp/docker-start.log"',
        'echo "=== Início startup dockerd: $(date) ===" > "$LOG"',
        // Limpa locks órfãos se dockerd não estiver em execução
        'if [ -f /var/run/docker.pid ] && ! pgrep -x dockerd >/dev/null 2>&1; then',
        '  echo "Removendo /var/run/docker.pid e socket órfãos..." >> "$LOG"',
        '  rm -f /var/run/docker.pid /var/run/docker.sock',
        'fi',
        // Checagem de disponibilidade dos binários
        'HAS_DOCKERD=0',
        'HAS_INIT=0',
        'if command -v dockerd >/dev/null 2>&1; then HAS_DOCKERD=1; fi',
        'if [ -x /etc/init.d/docker ]; then HAS_INIT=1; fi',
        'if [ "$HAS_DOCKERD" -eq 0 ] && [ "$HAS_INIT" -eq 0 ]; then',
        '  echo "DOCKER_NOT_INSTALLED" >> "$LOG"',
        '  exit 127',
        'fi',
        // Tier 1: SysVinit direto (funciona sem systemd no WSL2)
        'if [ "$HAS_INIT" -eq 1 ]; then',
        '  echo "Tier 1: /etc/init.d/docker start" >> "$LOG"',
        '  /etc/init.d/docker start >> "$LOG" 2>&1 || true',
        'fi',
        // Tier 2: Service wrapper
        'if ! pgrep -x dockerd >/dev/null 2>&1 && command -v service >/dev/null 2>&1; then',
        '  echo "Tier 2: service docker start" >> "$LOG"',
        '  service docker start >> "$LOG" 2>&1 || true',
        'fi',
        // Tier 3: Systemctl (somente se systemd for PID 1 ou /run/systemd/system existir)
        'if ! pgrep -x dockerd >/dev/null 2>&1 && [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1; then',
        '  echo "Tier 3: systemctl start docker" >> "$LOG"',
        '  systemctl start docker >> "$LOG" 2>&1 || true',
        'fi',
        // Tier 4: nohup dockerd direto com iptables-legacy
        'if ! pgrep -x dockerd >/dev/null 2>&1 && [ "$HAS_DOCKERD" -eq 1 ]; then',
        '  echo "Tier 4: nohup dockerd com iptables-legacy" >> "$LOG"',
        '  update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true',
        '  update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true',
        '  nohup dockerd >> "$LOG" 2>&1 &',
        'fi',
        // Espera socket responder e aplica permissões
        'for i in 1 2 3 4 5 6; do',
        '  if [ -S /var/run/docker.sock ]; then',
        '    chmod 666 /var/run/docker.sock',
        '    echo "DOCKER_STARTED_SUCCESS" >> "$LOG"',
        '    exit 0',
        '  fi',
        '  sleep 1',
        'done',
        'echo "DOCKER_FAILED_TO_START" >> "$LOG"',
        'exit 1'
      ].join('; ');

      try {
        await execFileAsync('wsl.exe', ['-d', distroName, '-u', 'root', '--', 'sh', '-c', startupScript], {
          timeout: 20000,
          windowsHide: true
        });
      } catch (scriptErr: any) {
        console.warn(`[WslService] Script de startup do Docker emitiu aviso na distro "${distroName}":`, scriptErr?.message);
      }

      // Aguarda até 5 segundos para confirmação através do client Docker
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (await this.testDockerInDistro(distroName)) {
          return {
            success: true,
            message: `Docker daemon iniciado com sucesso na distro WSL "${distroName}".`
          };
        }
      }

      // Se não iniciou, inspeciona o log gerado em /tmp/docker-start.log
      let logOutput = '';
      try {
        const { stdout } = await execFileAsync('wsl.exe', ['-d', distroName, '-u', 'root', '--', 'cat', '/tmp/docker-start.log'], {
          timeout: 4000,
          windowsHide: true
        });
        logOutput = stdout ? stdout.trim() : '';
      } catch {
        // Ignora falha na leitura do log
      }

      if (logOutput.includes('DOCKER_NOT_INSTALLED')) {
        return {
          success: false,
          message: `O Docker Engine não está instalado na distro WSL "${distroName}". Execute no terminal WSL: sudo apt update && sudo apt install -y docker.io`,
          error: 'DOCKER_NOT_INSTALLED'
        };
      }

      const snippet = logOutput.length > 0 ? logOutput.split('\n').slice(-8).join('\n') : '';
      return {
        success: false,
        message: `O comando de inicialização foi executado na distro "${distroName}", mas o daemon do Docker não respondeu.${snippet ? `\n\nLogs do WSL:\n${snippet}` : ' Certifique-se de que o Docker está instalado (sudo apt update && sudo apt install -y docker.io).'}`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha ao iniciar Docker daemon na distro "${distroName}".`,
        error: err?.message || String(err)
      };
    }
  }

  /**
   * Finaliza uma distribuição WSL específica (wsl --terminate <distro>).
   */
  public async terminateDistro(distroName: string): Promise<boolean> {
    if (!distroName || !isValidIdentifier(distroName)) return false;

    try {
      await execFileAsync('wsl.exe', ['--terminate', distroName], {
        timeout: 10000,
        windowsHide: true
      });
      // Invalida cache de distros
      this.cachedDistros = [];
      this.lastFetchTime = 0;
      return true;
    } catch (err) {
      console.error(`[WslService] Erro ao finalizar distro ${distroName}:`, err);
      return false;
    }
  }

  /**
   * Finaliza todo o subsistema WSL2 no Windows (wsl --shutdown).
   */
  public async shutdownWsl(): Promise<boolean> {
    try {
      await execFileAsync('wsl.exe', ['--shutdown'], {
        timeout: 12000,
        windowsHide: true
      });
      this.cachedDistros = [];
      this.lastFetchTime = 0;
      return true;
    } catch (err) {
      console.error('[WslService] Erro ao executar wsl --shutdown:', err);
      return false;
    }
  }

  /**
   * Abre um terminal conectado diretamente na raiz da distribuição WSL.
   */
  public async openWslTerminal(distroName: string): Promise<boolean> {
    if (!distroName || !isValidIdentifier(distroName)) return false;

    try {
      const wtArgs = ['-w', '0', 'nt', '--title', `WSL: ${distroName}`, 'wsl.exe', '-d', distroName];
      const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
      wtChild.on('error', () => {
        const child = spawn(
          'cmd.exe',
          ['/c', 'start', `WSL: ${distroName}`, 'cmd.exe', '/k', `wsl.exe -d ${distroName}`],
          { detached: true, stdio: 'ignore' }
        );
        child.unref();
      });
      wtChild.unref();
      return true;
    } catch (err) {
      console.error(`[WslService] Erro ao abrir terminal WSL para ${distroName}:`, err);
      return false;
    }
  }

  /**
   * Detecta o IP da interface de rede eth0 da distro WSL (ex: 172.x.x.x).
   */
  public async getDistroIp(distroName?: string): Promise<string | null> {
    if (process.platform !== 'win32') return null;

    try {
      const args = distroName && isValidIdentifier(distroName)
        ? ['-d', distroName, 'hostname', '-I']
        : ['hostname', '-I'];

      const { stdout } = await execFileAsync('wsl.exe', args, {
        timeout: 3000,
        windowsHide: true
      });

      const ips = stdout.trim().split(/\s+/);
      const ipv4 = ips.find((ip) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) && !ip.startsWith('127.'));
      return ipv4 || null;
    } catch {
      return null;
    }
  }

  /**
   * Garante a existência do diretório /opt/dumps na distro WSL e o abre no Windows Explorer.
   */
  public async openDumpsFolder(distroName?: string): Promise<{ success: boolean; path: string; error?: string }> {
    const targetDistro = distroName || (await this.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(targetDistro)) {
      return { success: false, path: '', error: 'Nome de distribuição WSL inválido.' };
    }

    try {
      // 1. Assegura que /opt/dumps existe e tem permissão 777
      await execFileAsync('wsl.exe', ['-d', targetDistro, '-u', 'root', '--', 'sh', '-c', 'mkdir -p /opt/dumps && chmod 777 /opt/dumps'], {
        timeout: 8000,
        windowsHide: true
      });

      // 2. Determina o caminho UNC acessível pelo Windows
      const uncLocalhost = `\\\\wsl.localhost\\${targetDistro}\\opt\\dumps`;
      const uncDollar = `\\\\wsl$\\${targetDistro}\\opt\\dumps`;
      const chosenPath = fs.existsSync(uncLocalhost) ? uncLocalhost : uncDollar;

      // 3. Abre no Windows Explorer
      const child = spawn('explorer.exe', [chosenPath], { detached: true, stdio: 'ignore' });
      child.unref();

      return { success: true, path: chosenPath };
    } catch (err: any) {
      console.error(`[WslService] Erro ao abrir /opt/dumps para ${targetDistro}:`, err);
      return { success: false, path: '', error: err?.message || String(err) };
    }
  }

  /**
   * Lista todos os arquivos .dmp presentes em /opt/dumps na distro WSL.
   */
  public async listDmpFiles(distroName?: string): Promise<WslDumpFileInfo[]> {
    const targetDistro = distroName || (await this.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(targetDistro)) return [];

    const formatBytes = (bytes: number): string => {
      if (bytes <= 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    };

    const dumps: WslDumpFileInfo[] = [];

    // Tentativa 1: Leitura direta via UNC path no Node.js
    try {
      const uncLocalhost = `\\\\wsl.localhost\\${targetDistro}\\opt\\dumps`;
      const uncDollar = `\\\\wsl$\\${targetDistro}\\opt\\dumps`;
      const dumpDir = fs.existsSync(uncLocalhost) ? uncLocalhost : fs.existsSync(uncDollar) ? uncDollar : null;

      if (dumpDir) {
        const entries = fs.readdirSync(dumpDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.toLowerCase().endsWith('.dmp')) {
            try {
              const fullPath = path.join(dumpDir, entry.name);
              const stat = fs.statSync(fullPath);
              dumps.push({
                name: entry.name,
                size: stat.size,
                formattedSize: formatBytes(stat.size),
                mtime: stat.mtime.toISOString()
              });
            } catch {
              dumps.push({
                name: entry.name,
                size: 0,
                formattedSize: 'Desconhecido'
              });
            }
          }
        }
        if (dumps.length > 0) {
          return dumps.sort((a, b) => (b.mtime || '').localeCompare(a.mtime || ''));
        }
      }
    } catch {
      // Falha no UNC -> prossegue para Fallback WSL
    }

    // Tentativa 2: Fallback executando find diretamente no WSL
    try {
      const { stdout } = await execFileAsync(
        'wsl.exe',
        [
          '-d',
          targetDistro,
          '--',
          'sh',
          '-c',
          'mkdir -p /opt/dumps 2>/dev/null; find /opt/dumps -maxdepth 1 -type f -iname "*.dmp" -printf "%f|%s|%T@\\n" 2>/dev/null'
        ],
        {
          timeout: 6000,
          windowsHide: true
        }
      );

      const lines = (stdout || '').trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split('|');
        if (parts.length >= 2 && parts[0]) {
          const name = parts[0];
          const size = parseInt(parts[1], 10) || 0;
          const timestampSec = parts[2] ? parseFloat(parts[2]) : 0;
          dumps.push({
            name,
            size,
            formattedSize: formatBytes(size),
            mtime: timestampSec ? new Date(timestampSec * 1000).toISOString() : undefined
          });
        }
      }
      return dumps.sort((a, b) => (b.mtime || '').localeCompare(a.mtime || ''));
    } catch {
      return dumps;
    }
  }

  /**
   * Gera hash MD5 para senhas do WinThor/WSH (em formatos minúsculo e maiúsculo).
   * O WSH exige DB_PASSWORD em formato MD5 maiúsculo no .env.
   */
  public generateMd5(text: string): { lower: string; upper: string } {
    const hash = crypto.createHash('md5').update(text || '', 'utf8').digest('hex');
    return {
      lower: hash.toLowerCase(),
      upper: hash.toUpperCase()
    };
  }

  /**
   * Abre a pasta /opt da distro WSL no Windows Explorer.
   */
  public async openWslOptFolder(distroName?: string): Promise<{ success: boolean; path: string; error?: string }> {
    const targetDistro = distroName || (await this.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(targetDistro)) {
      return { success: false, path: '', error: 'Nome de distribuição WSL inválido.' };
    }

    try {
      const uncLocalhost = `\\\\wsl.localhost\\${targetDistro}\\opt`;
      const uncDollar = `\\\\wsl$\\${targetDistro}\\opt`;
      const chosenPath = fs.existsSync(uncLocalhost) ? uncLocalhost : uncDollar;

      const child = spawn('explorer.exe', [chosenPath], { detached: true, stdio: 'ignore' });
      child.unref();

      return { success: true, path: chosenPath };
    } catch (err: any) {
      console.error(`[WslService] Erro ao abrir /opt no Explorer:`, err);
      return { success: false, path: '', error: err?.message || String(err) };
    }
  }

  /**
   * Verifica se os pré-requisitos essenciais do WSH existem em /opt na distro WSL.
   * Checa: Winthor.ini (ou winthor.ini), winthor-integracao-core.jar e wsh-image.tar.
   */
  public async checkWshPrerequisites(distroName?: string): Promise<WshPrerequisiteStatus[]> {
    const targetDistro = distroName || (await this.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(targetDistro)) return [];

    const formatBytes = (bytes: number): string => {
      if (bytes <= 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    };

    const filesToCheck = [
      {
        file: 'Winthor.ini',
        alternatives: ['Winthor.ini', 'winthor.ini'],
        label: 'Arquivo de Parâmetros de Banco (Winthor.ini)',
        required: true,
        description: 'Configuração dos parâmetros de conexão com o banco Oracle (montado em /tmp/Winthor.ini:ro)'
      },
      {
        file: 'winthor-integracao-core.jar',
        alternatives: ['winthor-integracao-core.jar'],
        label: 'Executável WSH (winthor-integracao-core.jar)',
        required: true,
        description: 'Binário Spring Boot do core de integração WinThor (copiado de C:\\pcsist\\produtos\\winthor-integracao-core\\)'
      },
      {
        file: 'wsh-image.tar',
        alternatives: ['wsh-image.tar'],
        label: 'Arquivo Tar da Imagem Docker (wsh-image.tar)',
        required: false,
        description: 'Arquivo de imagem pré-construída carregado automaticamente pelo script wsh_setup.sh'
      }
    ];

    const results: WshPrerequisiteStatus[] = [];

    // Tentativa 1: Leitura direta via UNC
    const uncLocalhost = `\\\\wsl.localhost\\${targetDistro}\\opt`;
    const uncDollar = `\\\\wsl$\\${targetDistro}\\opt`;
    const optDir = fs.existsSync(uncLocalhost) ? uncLocalhost : fs.existsSync(uncDollar) ? uncDollar : null;

    for (const item of filesToCheck) {
      let found = false;
      let size = 0;

      if (optDir) {
        for (const alt of item.alternatives) {
          const fullPath = path.join(optDir, alt);
          try {
            if (fs.existsSync(fullPath)) {
              const stat = fs.statSync(fullPath);
              found = true;
              size = stat.size;
              break;
            }
          } catch {
            // Ignora erro e continua
          }
        }
      }

      // Se não achou via UNC, tenta checar via WSL bash
      if (!found) {
        try {
          const testCmd = item.alternatives.map((alt) => `[ -f "/opt/${alt}" ] && stat -c "%s" "/opt/${alt}"`).join(' || ');
          const { stdout } = await execFileAsync('wsl.exe', ['-d', targetDistro, '--', 'sh', '-c', testCmd], {
            timeout: 3000,
            windowsHide: true
          });
          const parsed = parseInt((stdout || '').trim(), 10);
          if (!isNaN(parsed) && parsed > 0) {
            found = true;
            size = parsed;
          }
        } catch {
          // Não encontrado
        }
      }

      results.push({
        file: item.file,
        label: item.label,
        required: item.required,
        exists: found,
        size: found ? size : undefined,
        formattedSize: found ? formatBytes(size) : undefined,
        description: item.description
      });
    }

    return results;
  }

  /**
   * Obtém o diretório configurado de snapshots ou caminhos padrão onde snapshots .tar costumam residir.
   */
  public getSnapshotsDir(): string {
    const cfg = this.loadContainerManagerConfig();
    if (cfg.snapshotsDir && fs.existsSync(cfg.snapshotsDir)) {
      return cfg.snapshotsDir;
    }
    const candidates = [
      'C:\\Users\\wanderson.alves\\projetosTOTV',
      'C:\\Docker',
      'C:\\WSL',
      'D:\\WSL',
      'D:\\Docker'
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) return cand;
    }
    return 'C:\\Users\\wanderson.alves\\projetosTOTV';
  }

  /**
   * Salva o diretório de snapshots preferencial.
   */
  public setSnapshotsDir(dir: string): boolean {
    try {
      const cfgPath = this.getContainerManagerConfigPath();
      const current = this.loadContainerManagerConfig();
      current.snapshotsDir = dir;
      const cfgDir = path.dirname(cfgPath);
      if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(cfgPath, JSON.stringify(current, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lista todos os arquivos de snapshot .tar encontrados no diretório informado e diretórios padrão.
   */
  public async listSnapshots(customDir?: string): Promise<WslSnapshotFileInfo[]> {
    const searchDirs = new Set<string>();
    if (customDir && fs.existsSync(customDir)) {
      searchDirs.add(path.resolve(customDir));
    }
    const defaultDir = this.getSnapshotsDir();
    if (fs.existsSync(defaultDir)) {
      searchDirs.add(path.resolve(defaultDir));
    }
    const knownCandidates = [
      'C:\\Users\\wanderson.alves\\projetosTOTV',
      'C:\\Docker',
      'C:\\WSL'
    ];
    for (const cand of knownCandidates) {
      if (fs.existsSync(cand)) searchDirs.add(path.resolve(cand));
    }

    const results: WslSnapshotFileInfo[] = [];
    const seenPaths = new Set<string>();

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    for (const dir of searchDirs) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.toLowerCase().endsWith('.tar')) {
            const fullPath = path.join(dir, entry.name);
            if (seenPaths.has(fullPath.toLowerCase())) continue;
            seenPaths.add(fullPath.toLowerCase());

            try {
              const stat = fs.statSync(fullPath);
              results.push({
                name: entry.name,
                path: fullPath,
                sizeBytes: stat.size,
                formattedSize: formatBytes(stat.size),
                createdAt: (stat.birthtime || stat.mtime).toISOString()
              });
            } catch {
              // Ignora arquivo com erro de leitura
            }
          }
        }
      } catch {
        // Diretório inacessível
      }
    }

    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Importa uma distribuição WSL a partir de um arquivo de snapshot .tar.
   */
  public async importSnapshot(
    distroName: string,
    installDir: string,
    tarPath: string
  ): Promise<WslSnapshotActionResult> {
    if (!distroName || !isValidIdentifier(distroName)) {
      return { success: false, error: 'Nome de distribuição WSL inválido.' };
    }
    if (!tarPath || !fs.existsSync(tarPath)) {
      return { success: false, error: `Arquivo .tar não encontrado: ${tarPath}` };
    }
    if (!installDir) {
      return { success: false, error: 'Diretório de instalação não especificado.' };
    }

    try {
      if (!fs.existsSync(installDir)) {
        fs.mkdirSync(installDir, { recursive: true });
      }

      // 1. Desliga o WSL antes de importar para evitar bloqueios de arquivo VHD
      await this.shutdownWsl();

      // 2. Executa wsl --import com timeout estendido (15 minutos)
      await execFileAsync(
        'wsl.exe',
        ['--import', distroName, installDir, tarPath],
        { timeout: 900000, windowsHide: true }
      );

      this.cachedDistros = [];
      this.lastFetchTime = 0;
      await this.listDistros(true);

      return {
        success: true,
        message: `Distribuição "${distroName}" importada com sucesso a partir de ${path.basename(tarPath)}!`
      };
    } catch (err: any) {
      console.error(`[WslService] Erro ao importar snapshot WSL ${distroName}:`, err);
      return {
        success: false,
        error: err?.message || 'Falha ao importar snapshot WSL.'
      };
    }
  }

  /**
   * Exporta uma distribuição WSL existente para um arquivo .tar de snapshot.
   */
  public async exportSnapshot(
    distroName: string,
    outputPath: string
  ): Promise<WslSnapshotActionResult> {
    if (!distroName || !isValidIdentifier(distroName)) {
      return { success: false, error: 'Nome de distribuição WSL inválido.' };
    }
    if (!outputPath) {
      return { success: false, error: 'Caminho do arquivo de saída não especificado.' };
    }

    try {
      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // 1. Desliga o WSL antes de exportar
      await this.shutdownWsl();

      // 2. Executa wsl --export (15 minutos)
      await execFileAsync(
        'wsl.exe',
        ['--export', distroName, outputPath],
        { timeout: 900000, windowsHide: true }
      );

      return {
        success: true,
        message: `Distribuição "${distroName}" exportada com sucesso para ${outputPath}!`
      };
    } catch (err: any) {
      console.error(`[WslService] Erro ao exportar distro WSL ${distroName}:`, err);
      return {
        success: false,
        error: err?.message || 'Falha ao exportar distro WSL.'
      };
    }
  }

  /**
   * Remove/desregistra completamente uma distribuição WSL (wsl --unregister).
   */
  public async unregisterDistro(distroName: string): Promise<WslSnapshotActionResult> {
    if (!distroName || !isValidIdentifier(distroName)) {
      return { success: false, error: 'Nome de distribuição WSL inválido.' };
    }

    try {
      await execFileAsync('wsl.exe', ['--unregister', distroName], {
        timeout: 30000,
        windowsHide: true
      });

      // Remove ambientes associados a essa distro
      try {
        const cfgPath = this.getContainerManagerConfigPath();
        const current = this.loadContainerManagerConfig();
        const prevCount = current.environments.length;
        current.environments = current.environments.filter((e) => e.wslDistro !== distroName);
        if (current.environments.length !== prevCount) {
          fs.writeFileSync(cfgPath, JSON.stringify(current, null, 2), 'utf-8');
        }
      } catch {
        // Ignora erro de persistência
      }

      this.cachedDistros = [];
      this.lastFetchTime = 0;
      await this.listDistros(true);

      return {
        success: true,
        message: `Distribuição "${distroName}" desregistrada com sucesso.`
      };
    } catch (err: any) {
      console.error(`[WslService] Erro ao desregistrar distro WSL ${distroName}:`, err);
      return {
        success: false,
        error: err?.message || 'Falha ao desregistrar distribuição WSL.'
      };
    }
  }

  /**
   * Verifica a disponibilidade dos scripts de bootstrap do INFR-Docker.
   */
  public async checkInfrDockerScripts(customBasePath?: string): Promise<InfrDockerScriptStatus[]> {
    const candidates = [
      customBasePath,
      'C:\\Users\\wanderson.alves\\projetosTOTV\\INFR-Docker',
      'C:\\projetos\\INFR-Docker',
      'D:\\projetos\\INFR-Docker'
    ].filter(Boolean) as string[];

    const resolvedBase = candidates.find((c) => fs.existsSync(c)) || candidates[0];

    const scriptDefinitions: Array<{
      script: string;
      name: string;
      relPath: string;
      type: 'oracle' | 'wta' | 'wsh';
      description: string;
    }> = [
      {
        script: 'oracle_setup.sh',
        name: 'Setup Oracle XE 11g',
        relPath: 'oracle-winthor/oracle_setup.sh',
        type: 'oracle',
        description: 'Cria e inicializa container Oracle XE com listener e volumes configurados'
      },
      {
        script: 'import_dump.sh',
        name: 'Importador Data Pump',
        relPath: 'oracle-winthor/11.2.0.2-xe/tools/import_dump.sh',
        type: 'oracle',
        description: 'Script de automação para import de dumps .dmp via impdp'
      },
      {
        script: 'wta_setup.sh',
        name: 'Setup WTA (Apache Karaf)',
        relPath: 'linux-winthor/scripts/wta_setup.sh',
        type: 'wta',
        description: 'Inicializa o container WTA com as portas e montagem do repositório Maven'
      },
      {
        script: 'wta.env.example',
        name: 'Modelo wta.env',
        relPath: 'linux-winthor/common/wta.env.example',
        type: 'wta',
        description: 'Arquivo de variáveis de ambiente com parâmetros de conexão com o banco Oracle'
      },
      {
        script: 'wsh_setup.sh',
        name: 'Setup Winthor Smart Hub',
        relPath: 'wsh-winthor/wsh_setup.sh',
        type: 'wsh',
        description: 'Configura o container WSH apontando para o Winthor.ini e porta 8080'
      },
      {
        script: '.env.example',
        name: 'Modelo .env WSH',
        relPath: 'wsh-winthor/.env.example',
        type: 'wsh',
        description: 'Modelo de credenciais do banco com senha em hash MD5 maiúsculo'
      }
    ];

    return scriptDefinitions.map((def) => {
      const fullPath = path.join(resolvedBase, def.relPath);
      const exists = fs.existsSync(fullPath);
      return {
        script: def.script,
        name: def.name,
        path: fullPath,
        exists,
        type: def.type,
        description: def.description
      };
    });
  }

  /**
   * Executa um script de bootstrap do INFR-Docker via terminal do Windows ou WSL.
   */
  public async runInfrSetupScript(
    scriptType: 'oracle' | 'wta' | 'wsh',
    options: {
      containerName?: string;
      port?: number;
      distro?: string;
      infrPath?: string;
    }
  ): Promise<{ success: boolean; output: string }> {
    const targetDistro = options.distro || (await this.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(targetDistro)) {
      return { success: false, output: 'Nome de distribuição WSL inválido.' };
    }

    const basePath = options.infrPath || 'C:\\Users\\wanderson.alves\\projetosTOTV\\INFR-Docker';

    // Converte caminho do Windows para caminho /mnt/... do WSL
    const wslPath = basePath
      .replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`)
      .replace(/\\/g, '/');

    let cmdToRun = '';
    let title = '';

    if (scriptType === 'oracle') {
      const container = (options.containerName || 'oracle-winthor').replace(/[^a-zA-Z0-9_.-]/g, '') || 'oracle-winthor';
      const port = typeof options.port === 'number' && options.port > 0 && options.port <= 65535 ? options.port : 1521;
      title = `Setup Oracle XE: ${container}`;
      cmdToRun = `cd "${wslPath}/oracle-winthor" && chmod +x ./oracle_setup.sh && ./oracle_setup.sh --container ${container} --port ${port}`;
    } else if (scriptType === 'wta') {
      const container = (options.containerName || 'linux-winthor').replace(/[^a-zA-Z0-9_.-]/g, '') || 'linux-winthor';
      const port = typeof options.port === 'number' && options.port > 0 && options.port <= 65535 ? options.port : 8080;
      title = `Setup WTA: ${container}`;
      cmdToRun = `cd "${wslPath}/linux-winthor/scripts" && chmod +x ./wta_setup.sh && ./wta_setup.sh --container ${container} --port ${port}`;
    } else if (scriptType === 'wsh') {
      title = 'Setup WSH';
      cmdToRun = `cd "${wslPath}/wsh-winthor" && chmod +x ./wsh_setup.sh && ./wsh_setup.sh`;
    } else {
      return { success: false, output: `Tipo de script desconhecido: ${scriptType}` };
    }

    try {
      const wtArgs = [
        '-w', '0', 'nt',
        '--title', title,
        'wsl.exe', '-d', targetDistro, '--',
        'bash', '-c', `${cmdToRun}; echo ''; echo 'Pressione Enter para fechar...'; read -r`
      ];

      const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
      wtChild.on('error', () => {
        const child = spawn(
          'cmd.exe',
          ['/c', 'start', title, 'cmd.exe', '/k', `wsl.exe -d ${targetDistro} -- bash -c "${cmdToRun}"`],
          { detached: true, stdio: 'ignore' }
        );
        child.unref();
      });
      wtChild.unref();

      return { success: true, output: `Terminal iniciado para execução: ${cmdToRun}` };
    } catch (err: any) {
      console.error(`[WslService] Erro ao executar script ${scriptType}:`, err);
      return { success: false, output: err?.message || 'Falha ao iniciar execução do script.' };
    }
  }
}

export const wslService = new WslService();
