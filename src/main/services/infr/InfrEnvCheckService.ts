import { spawn } from 'child_process';
import { execFileAsync, isValidIdentifier } from '../../utils/security';
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
  type InfrEnvCheck
} from '../../../shared/infrEnvCheck';
import { commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import type { WslService } from '../WslService';

/**
 * Verificar um ambiente do INFR-Docker depois do Gerar: estado, health, reinícios, portas e fim do
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
        `echo '@@ports'; docker port ${role}-${n} 2>/dev/null; echo '@@logs'; docker logs --tail 30 ${role}-${n} 2>&1 | tail -n 30`
    ).join('; ');
    let output: string;
    try {
      const { stdout } = await execFileAsync('wsl.exe', ['-d', distro, '--', 'bash', '-c', script], {
        timeout: 60000,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024
      });
      output = String(stdout);
    } catch (err: any) {
      return { success: false, error: `Não foi possível ler os containers na distro ${distro}: ${commandFailureDetail(err)}`, distro, name: n, containers: [] };
    }
    const containers = parseEnvCheckOutput(output, n);
    const wta = containers.find((c) => c.role === 'wta');
    const port = wta?.exists ? wtaHostPort(wta.ports) : undefined;
    let wtaHttp: InfrEnvCheck['wtaHttp'];
    if (port && wta?.state === 'running') {
      const url = `http://localhost:${port}/`;
      try {
        const res = await httpRequest(url, { method: 'GET', headers: {}, timeout: 5000 });
        wtaHttp = { url, status: res.status };
      } catch (err: any) {
        wtaHttp = { url, error: String(err?.message || err) };
      }
    }
    return {
      success: true,
      name: n,
      distro,
      checkedAt: new Date().toISOString(),
      containers,
      wtaHttp,
      summary: summarizeEnvCheck(containers, wtaHttp)
    };
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
