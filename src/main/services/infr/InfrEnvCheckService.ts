import { spawn } from 'child_process';
import { isValidIdentifier } from '../../utils/security';
import { execWsl } from '../../utils/wslExec';
import { httpRequest } from '../../utils/httpRequest';
import { wtArg } from '../../utils/windowsTerminal';
import { isValidEnvName } from '../../../shared/infrWinthorVersion';
import {
  INFR_ROLES,
  infrCheckCommands,
  parseEnvCheckOutput,
  summarizeEnvCheck,
  wtaHostPort,
  type InfrCheckCommandId,
  type InfrEnvCheck,
  type InfrRole
} from '../../../shared/infrEnvCheck';
import { WTA_LOGIN_PATH, postChecks, refineSummary, type InfrHttpProbe } from '../../../shared/infrPostCheck';
import { buildLogPath, buildLogProbeScript, parseBuildLogProbe } from '../../../shared/infrBuildLog';
import { commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import type { WslService } from '../WslService';

/**
 * Verificar um ambiente do INFR-Docker depois da criação: estado, health, reinícios, portas e fim do
 * log de oracle/wta/wsh-<nome> numa só chamada ao WSL, e se o WTA responde pela porta publicada.
 */
export class InfrEnvCheckService {
  constructor(private readonly wsl: Pick<WslService, 'findDockerWslDistro'>) {}

  private async distroOf(distro?: string): Promise<string | null> {
    const d = distro || (await this.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
    return isValidIdentifier(d) ? d : null;
  }

  public async check(distroName: string | undefined, name: string): Promise<InfrEnvCheck> {
    if (!isValidEnvName(name)) return { success: false, error: 'Nome de ambiente inválido (ex.: develop).', containers: [] };
    const distro = await this.distroOf(distroName);
    if (!distro) return { success: false, error: 'Distro WSL inválida.', containers: [] };
    const n = name.trim();
    const format = '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}|{{.RestartCount}}|{{.State.StartedAt}}|{{.Config.Image}}';
    const script = INFR_ROLES.map(
      (role) =>
        `echo '@@c ${role}-${n}'; docker inspect -f '${format}' ${role}-${n} 2>/dev/null || echo MISSING; ` +
        `echo '@@ports'; docker port ${role}-${n} 2>/dev/null; echo '@@logs'; docker logs --tail 30 ${role}-${n} 2>&1 | tail -n 30` +
        // Karaf travado: só o WTA, e no log inteiro (o fim do log pode já ter passado das linhas de timeout)
        (role === 'wta' ? `; echo '@@stuck'; docker logs --timestamps ${role}-${n} 2>&1 | grep -E 'has timed out waiting|pacotes em transi' | tail -n 40 | cut -c1-300` : '')
    ).join('; ');
    let output: string;
    try {
      const { stdout } = await execWsl(['-d', distro, '--', 'bash', '-c', script], { timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
      output = String(stdout);
    } catch (err: any) {
      return { success: false, error: `Não foi possível ler os containers na distro ${distro}: ${commandFailureDetail(err)}`, distro, name: n, containers: [] };
    }
    const containers = parseEnvCheckOutput(output, n);
    const wta = containers.find((c) => c.role === 'wta');
    const port = wta?.exists ? wtaHostPort(wta.ports) : undefined;
    const probe = async (url: string): Promise<InfrHttpProbe> => {
      try {
        const res = await httpRequest(url, { method: 'GET', headers: {}, timeout: 5000 });
        return { url, status: res.status };
      } catch (err: any) {
        return { url, error: String(err?.message || err) };
      }
    };
    const up = !!port && wta?.state === 'running';
    const wtaHttp: InfrEnvCheck['wtaHttp'] = up ? await probe(`http://localhost:${port}/`) : undefined;
    // A raiz responde mesmo com o Karaf travado; a rota de login só existe com a autenticação no ar
    const wtaLogin = up && wtaHttp?.status ? await probe(`http://localhost:${port}${WTA_LOGIN_PATH}`) : undefined;
    const buildLog = await this.readBuildLog(distro, n);
    const post = postChecks(containers, wtaHttp, wtaLogin);
    return {
      success: true,
      name: n,
      distro,
      checkedAt: new Date().toISOString(),
      containers,
      wtaHttp,
      wtaLogin,
      buildLog,
      post,
      summary: refineSummary(summarizeEnvCheck(containers, wtaHttp, buildLog), post)
    };
  }

  /**
   * Correção da validação: liga ou reinicia um container do ambiente. O nome sai do papel e do nome do ambiente
   * validados; a tela nunca manda o comando.
   */
  public async fixContainer(distroName: string | undefined, name: string, role: InfrRole, action: 'start' | 'restart'): Promise<{ success: boolean; output: string }> {
    if (!isValidEnvName(name) || !INFR_ROLES.includes(role) || !['start', 'restart'].includes(action)) return { success: false, output: 'Pedido inválido.' };
    const distro = await this.distroOf(distroName);
    if (!distro) return { success: false, output: 'Distro WSL inválida.' };
    const container = `${role}-${name.trim()}`;
    try {
      await execWsl(['-d', distro, '--', 'docker', action, container], { timeout: 120000 });
      return { success: true, output: `${container}: ${action === 'start' ? 'ligado' : 'reiniciado'}. O Hub confere de novo enquanto ele sobe.` };
    } catch (err: any) {
      return { success: false, output: `Não foi possível ${action === 'start' ? 'ligar' : 'reiniciar'} ${container}: ${commandFailureDetail(err)}` };
    }
  }

  /** Fim do log que o terminal do Criar grava em /tmp da distro; sem o arquivo, não há relatório. */
  private async readBuildLog(distro: string, name: string): Promise<InfrEnvCheck['buildLog']> {
    const path = buildLogPath(name);
    if (!path) return undefined;
    try {
      // O wsl.exe expande o `$` antes do bash: o roteiro vai em base64 e é decodificado dentro da distro
      const b64 = Buffer.from(buildLogProbeScript(path)).toString('base64');
      const { stdout } = await execWsl(['-d', distro, '--', 'bash', '-c', `echo ${b64} | base64 -d | bash`], { timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
      return parseBuildLogProbe(path, String(stdout));
    } catch {
      return undefined;
    }
  }

  /**
   * Abre um comando de verificação no terminal da distro. O comando é montado aqui pelo id (a tela
   * nunca manda texto livre para executar), com o nome e a porta validados.
   */
  public async openCheckTerminal(distroName: string | undefined, name: string, id: InfrCheckCommandId, wtaPort?: number): Promise<{ success: boolean; output: string }> {
    const distro = await this.distroOf(distroName);
    if (!distro) return { success: false, output: 'Distro WSL inválida.' };
    const cmd = infrCheckCommands(name, wtaPort).find((c) => c.id === id);
    if (!cmd) return { success: false, output: 'Comando de verificação inválido.' };
    const title = `${cmd.label}: ${name.trim()}`;
    const script = `${cmd.command}; echo ''; echo 'Pressione Enter para fechar...'; read -r`;
    const wtChild = spawn('wt.exe', ['-w', '0', 'nt', '--title', title, 'wsl.exe', '-d', distro, '--', 'bash', '-c', wtArg(script)], {
      detached: true,
      stdio: 'ignore'
    });
    wtChild.on('error', () => {
      // Sem Windows Terminal: um console com o wsl.exe direto, sem passar pelo cmd (que quebraria aspas e &&)
      spawn('wsl.exe', ['-d', distro, '--', 'bash', '-c', script], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
    });
    wtChild.unref();
    return { success: true, output: `Terminal aberto: ${cmd.command}` };
  }
}
