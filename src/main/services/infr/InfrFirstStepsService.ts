import fs from 'fs';
import path from 'path';
import { execFileAsync, isValidIdentifier } from '../../utils/security';
import { httpRequest } from '../../utils/httpRequest';
import { isValidWinthorVersion } from '../../../shared/infrWinthorVersion';
import { buildFirstSteps, parseDistroProbe, type InfrFirstStepsProbe, type InfrFirstStepsResult } from '../../../shared/infrFirstSteps';
import { INFR_PCSIST_PATH, INFR_SETUP_SCRIPTS, firstStepsContainers, infrEnvFiles } from '../../../shared/infrFirstStepsCommands';
import { INFR_NEW_VERSION_SCRIPTS, commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import type { Routine801Service } from '../Routine801Service';
import type { WslService } from '../WslService';

/** "WSL version: 2.4.13.0" (ou "Versão do WSL: ...") do wsl --version, que sai em UTF-16LE. */
export function parseWslVersion(raw: Buffer | string): string | undefined {
  const text = (Buffer.isBuffer(raw) ? raw.toString('utf16le') : raw).replace(/\0/g, '');
  return /(\d+\.\d+\.\d+)(?:\.\d+)?/.exec(text.split(/\r?\n/)[0] ?? '')?.[1];
}

/**
 * Primeiros passos do Assistente INFR: lê o computador (WSL, distro, Docker, Git, clone do
 * INFR-Docker, arquivos fora do git, containers da versão e o login do WTA) e devolve o checklist.
 * Uma chamada ao wsl.exe para tudo o que é de dentro da distro.
 */
export class InfrFirstStepsService {
  constructor(
    private readonly wsl: Pick<WslService, 'listDistros' | 'resolveInfrPaths'>,
    private readonly routine801: Pick<Routine801Service, 'testWtaLogin'>
  ) {}

  private async wslStatus(distros: string[]): Promise<InfrFirstStepsProbe['wsl']> {
    try {
      const { stdout } = await execFileAsync('wsl.exe', ['--version'], { timeout: 8000, windowsHide: true, encoding: 'buffer' });
      return { installed: true, version: parseWslVersion(stdout as Buffer) };
    } catch {
      // WSL antigo (da loja não) não tem --version, mas roda distros
      return { installed: distros.length > 0 };
    }
  }

  private async hasGit(): Promise<boolean> {
    try {
      await execFileAsync('git', ['--version'], { timeout: 5000, windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }

  private async infrState(infrPath?: string): Promise<InfrFirstStepsProbe['infr'] | null> {
    const infr = this.wsl.resolveInfrPaths(infrPath);
    if (!infr) return null;
    const folder = infr.windows;
    const exists = fs.existsSync(folder);
    const isGit = exists && fs.existsSync(path.join(folder, '.git'));
    let branch: string | undefined;
    if (isGit) {
      try {
        branch = String((await execFileAsync('git', ['-C', folder, 'rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 5000, windowsHide: true })).stdout).trim();
      } catch {
        branch = undefined;
      }
    }
    const missingScripts = exists ? [...INFR_SETUP_SCRIPTS, ...INFR_NEW_VERSION_SCRIPTS].filter((s, i, all) => all.indexOf(s) === i && !fs.existsSync(path.join(folder, s))) : [];
    return { folder, exists, isGit, branch, missingScripts };
  }

  /** Um script só na distro: Docker, rede, /opt/dumps, Winthor.ini, jars, estado dos containers e a porta do WTA. */
  private async distroState(distro: string, version: string): Promise<ReturnType<typeof parseDistroProbe> | { error: string }> {
    const c = firstStepsContainers(version);
    // Um Docker travado deixa cada comando pendurado: cada chamada tem limite, e sem resposta no
    // docker version as outras nem rodam (o checklist mostra "o Docker não respondeu")
    const script = [
      "V=$(timeout 8 docker version --format '{{.Server.Version}}' 2>/dev/null); echo \"$V\"",
      'echo \'@@\'; [ -n "$V" ] && timeout 8 docker network inspect winthor-network >/dev/null 2>&1 && echo yes',
      "echo '@@'; ls /opt/dumps/*.dmp 2>/dev/null | xargs -r -n1 basename",
      "echo '@@'; test -f /opt/Winthor.ini && echo yes",
      "echo '@@'; ls /opt/*.jar 2>/dev/null | xargs -r -n1 basename",
      `echo '@@'; [ -n "$V" ] && for r in oracle wta wsh; do echo "$r|$(timeout 8 docker inspect -f '{{.State.Status}}' $r-${version} 2>/dev/null)"; done`,
      `echo '@@'; [ -n "$V" ] && timeout 8 docker port ${c.wta} 8080 2>/dev/null | head -1`,
      'true'
    ].join('; ');
    try {
      const { stdout } = await execFileAsync('wsl.exe', ['-d', distro, '--', 'bash', '-c', script], { timeout: 45000, windowsHide: true });
      return parseDistroProbe(String(stdout));
    } catch (err: any) {
      return { error: `Não foi possível ler a distro ${distro}: ${commandFailureDetail(err)}` };
    }
  }

  public async check(req: { distro?: string; infrPath?: string; version?: string }): Promise<InfrFirstStepsResult> {
    const version = (req.version ?? '').trim();
    if (!isValidWinthorVersion(version)) return { success: false, error: 'Versão do WinThor inválida (ex.: 39).', steps: [] };
    if (req.distro && !isValidIdentifier(req.distro)) return { success: false, error: 'Distro WSL inválida.', steps: [] };

    const distros = (await this.wsl.listDistros(true)).map((d) => d.name);
    const [wsl, git, infr] = await Promise.all([this.wslStatus(distros), this.hasGit(), this.infrState(req.infrPath)]);
    if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.', steps: [] };
    const distro = req.distro && distros.includes(req.distro) ? req.distro : distros.find((d) => d.toLowerCase().includes('winthor'));

    const files = infr.exists ? infrEnvFiles(version) : undefined;
    const probe: InfrFirstStepsProbe = {
      wsl,
      distros,
      distro,
      git,
      infr,
      version,
      envFiles: files && { wta: fs.existsSync(path.join(infr.folder, files.wta)), wsh: fs.existsSync(path.join(infr.folder, files.wsh)) }
    };

    let error: string | undefined;
    if (distro) {
      const d = await this.distroState(distro, version);
      if ('error' in d) error = d.error;
      else {
        probe.docker = d.docker;
        probe.files = d.files && { ...d.files, pcsist: infr.exists && fs.existsSync(path.join(infr.folder, INFR_PCSIST_PATH)) };
        probe.containers = d.containers;
        if (d.wtaPort && d.containers?.wta === 'running') probe.wta = await this.wtaState(`http://localhost:${d.wtaPort}`);
      }
    }
    return { success: true, error, checkedAt: new Date().toISOString(), probe, steps: buildFirstSteps(probe) };
  }

  private async wtaState(url: string): Promise<NonNullable<InfrFirstStepsProbe['wta']>> {
    try {
      const http = (await httpRequest(`${url}/`, { method: 'GET', headers: {}, timeout: 5000 })).status;
      const login = http < 500 ? await this.routine801.testWtaLogin(url) : undefined;
      return { url, http, login: login && { ok: login.ok, error: login.error, needsCredentials: login.needsCredentials } };
    } catch (err: any) {
      return { url, error: String(err?.message || err) };
    }
  }
}
