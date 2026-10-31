import fs from 'fs';
import path from 'path';
import { execFileAsync, isValidIdentifier } from '../../utils/security';
import { httpRequest } from '../../utils/httpRequest';
import { isValidEnvName } from '../../../shared/infrWinthorVersion';
import { INFR_NEW_VERSION_SCRIPTS, commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import { buildOriginCheck, type InfrOriginCheck } from '../../../shared/infrOriginCheck';
import type { Routine801Service } from '../Routine801Service';
import type { WslService } from '../WslService';

/**
 * Conferência da origem no passo 1 da Nova versão: pasta do INFR-Docker com os scripts, WTA de
 * origem rodando e respondendo, e o login do WTA. Rápida (uma chamada ao WSL e duas ao WTA), para a
 * pessoa saber antes de preencher o resto.
 */
export class InfrOriginCheckService {
  constructor(
    private readonly wsl: Pick<WslService, 'findDockerWslDistro' | 'resolveInfrPaths'>,
    private readonly routine801: Pick<Routine801Service, 'testWtaLogin'>
  ) {}

  public async check(req: { distro?: string; infrPath?: string; fromEnv: string }): Promise<InfrOriginCheck> {
    if (!isValidEnvName(req.fromEnv)) return { success: false, error: 'Ambiente de origem inválido.', items: [] };
    const distro = req.distro || (await this.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(distro)) return { success: false, error: 'Distro WSL inválida.', items: [] };
    const infr = this.wsl.resolveInfrPaths(req.infrPath);
    if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.', items: [] };

    const missingScripts = INFR_NEW_VERSION_SCRIPTS.filter((s) => !fs.existsSync(path.join(infr.windows, s)));
    const container = `wta-${req.fromEnv.trim()}`;
    let state: string | undefined;
    let url: string | undefined;
    try {
      const { stdout } = await execFileAsync(
        'wsl.exe',
        ['-d', distro, '--', 'bash', '-c', `docker inspect -f '{{.State.Status}}' ${container} 2>/dev/null; echo '@@'; docker port ${container} 8080 2>/dev/null | head -1`],
        { timeout: 30000, windowsHide: true }
      );
      const [inspect, ports] = String(stdout).split('@@');
      state = inspect.trim() || undefined;
      const port = /:(\d{2,5})\s*$/.exec(ports.trim())?.[1];
      url = port ? `http://localhost:${port}` : undefined;
    } catch (err: any) {
      return { success: false, error: `Não foi possível ler o ${container} na distro ${distro}: ${commandFailureDetail(err)}`, items: [] };
    }

    let http: { status?: number; error?: string } | undefined;
    let login: Awaited<ReturnType<Routine801Service['testWtaLogin']>> | undefined;
    if (state === 'running' && url) {
      try {
        http = { status: (await httpRequest(`${url}/`, { method: 'GET', headers: {}, timeout: 5000 })).status };
      } catch (err: any) {
        http = { error: String(err?.message || err) };
      }
      if (http.status && http.status < 500) login = await this.routine801.testWtaLogin(url);
    }
    return { success: true, originWtaUrl: url, items: buildOriginCheck({ folder: infr.windows, missingScripts, container, state, url, http, login }) };
  }
}
