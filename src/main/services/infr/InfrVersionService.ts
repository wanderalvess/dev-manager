import fs from 'fs';
import path from 'path';
import { execFileAsync, isValidIdentifier } from '../../utils/security';
import {
  groupInfrEnvironments,
  isValidEnvName,
  isValidWinthorVersion,
  type InfrEnvironmentsResult
} from '../../../shared/infrWinthorVersion';
import {
  checkManifestAgainstWsh,
  parseVersionManifest,
  parseWshDependencies,
  serializeVersionManifest,
  upgradeManifestFromCatalog,
  type InfrVersionPreview,
  type InfrVersionPreviewRequest
} from '../../../shared/infrVersionManifest';
import type { Routine801Service } from '../Routine801Service';
import type { WslService } from '../WslService';

const WSL_FILE = /^\/[a-zA-Z0-9_./-]+$/;
const SAFE_URL = /^https?:\/\/[a-zA-Z0-9.-]+(:\d{2,5})?$/;

/**
 * Gera a versão nova de um ambiente WinThor a partir de outro (Assistente INFR → Nova versão):
 * lê a lista de features do WTA de origem, sobe pelo catálogo de atualizações da rotina 801 sem
 * passar da versão alvo, confere contra o `dependencies.json` do WSH da versão e grava o manifesto
 * `linux-winthor/versions/<versão>.features`. O ambiente (imagem, banco, WTA e WSH) é montado pelo
 * `new_version_env.sh` do INFR-Docker, aberto no terminal pelo WslService.
 */
export class InfrVersionService {
  constructor(
    private readonly wsl: WslService,
    private readonly routine801: Pick<Routine801Service, 'fetchUpdates'>
  ) {}

  private async run(distro: string, script: string, timeout = 120000): Promise<string> {
    const { stdout } = await execFileAsync('wsl.exe', ['-d', distro, '--', 'bash', '-c', script], {
      timeout,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024
    });
    return String(stdout);
  }

  /** URL do WTA de origem pela porta publicada da 8080 do container (o WSL2 encaminha o localhost). */
  private async originUrl(distro: string, container: string): Promise<string | null> {
    const out = await this.run(distro, `docker port ${container} 8080 2>/dev/null | head -1`, 20000);
    const port = /:(\d{2,5})\s*$/.exec(out.trim())?.[1];
    return port ? `http://localhost:${port}` : null;
  }

  private async readWshDependencies(distro: string, jar: string): Promise<string> {
    const py = "import zipfile,sys;print(zipfile.ZipFile(sys.argv[1]).read('BOOT-INF/classes/dependencies.json').decode())";
    return this.run(distro, `python3 -I -c "${py}" '${jar}'`, 30000);
  }

  /** Ambientes (oracle/wta/wsh-<nome>), todos os Oracles e os jars do WSH em /opt da distro. */
  public async listEnvironments(distroName?: string): Promise<InfrEnvironmentsResult> {
    const empty = { environments: [], oracles: [], wshJars: [] };
    const distro = distroName || (await this.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(distro)) return { success: false, error: 'Distro WSL inválida.', ...empty };
    try {
      const ps = await this.run(distro, `docker ps -a --format '{{.Names}}|{{.Image}}|{{.State}}|{{.Ports}}'`, 30000);
      const jars = await this.run(distro, `find /opt -maxdepth 4 -name '*integracao-core*.jar' 2>/dev/null | sort`, 30000);
      return {
        success: true,
        distro,
        ...groupInfrEnvironments(ps.split(/\r?\n/)),
        wshJars: jars.split(/\r?\n/).map((j) => j.trim()).filter((j) => WSL_FILE.test(j))
      };
    } catch (err: any) {
      return { success: false, error: `Não foi possível listar os containers da distro ${distro}: ${err?.message || err}`, distro, ...empty };
    }
  }

  public async preview(req: InfrVersionPreviewRequest): Promise<InfrVersionPreview> {
    const target = req.targetVersion?.trim();
    if (!isValidWinthorVersion(target)) return { success: false, error: 'Versão alvo inválida (ex.: 40).' };
    if (!isValidEnvName(req.fromEnv)) return { success: false, error: 'Ambiente de origem inválido (ex.: master).' };
    if (req.wshJar && !WSL_FILE.test(req.wshJar.trim())) return { success: false, error: 'Caminho do jar do WSH inválido.' };
    if (req.originWtaUrl && !SAFE_URL.test(req.originWtaUrl.trim())) return { success: false, error: 'URL do WTA de origem inválida.' };
    const distro = req.distro || (await this.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(distro)) return { success: false, error: 'Distro WSL inválida.' };
    const infr = this.wsl.resolveInfrPaths(req.infrPath);
    if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.' };

    const from = req.fromEnv.trim();
    const container = `wta-${from}`;
    const tmp = `/tmp/hub-origem-${from}.features`;
    let originText: string;
    try {
      await this.run(
        distro,
        `cd "${infr.wsl}/linux-winthor" && bash scripts/export_features.sh --version ${target} --container ${container} --out ${tmp}`,
        180000
      );
      originText = await this.run(distro, `cat ${tmp}`, 20000);
    } catch (err: any) {
      return { success: false, error: `Não foi possível ler as features do ${container}: ${err?.message || err}` };
    }
    const origin = parseVersionManifest(originText);
    if (origin.features.length === 0) {
      return { success: false, error: `O ${container} não devolveu features. Ele está rodando e com o Karaf de pé?` };
    }

    const url = req.originWtaUrl?.trim() || (await this.originUrl(distro, container));
    if (!url) return { success: false, error: `Porta 8080 do ${container} não publicada; informe a URL do WTA de origem.` };
    let catalog;
    try {
      catalog = await this.routine801.fetchUpdates(url);
    } catch (err: any) {
      return { success: false, error: `Catálogo da rotina 801 em ${url}: ${err?.message || err}`, originWtaUrl: url };
    }

    const upgrade = upgradeManifestFromCatalog(origin, catalog, parseInt(target, 10));
    const header = [
      `WinThor ${target} — features da versão`,
      `Gerado pelo Hub Manager em ${new Date().toISOString().slice(0, 10)} a partir do ambiente ${from}`,
      `e do catálogo de atualizações da rotina 801 (${upgrade.changes.length} atualizadas, ${upgrade.behind.length} sem versão da linha ${target}).`
    ];
    const result: InfrVersionPreview = {
      success: true,
      originWtaUrl: url,
      originCount: origin.features.length,
      upgrade: { changes: upgrade.changes, behind: upgrade.behind, skipped: upgrade.skipped },
      manifestText: serializeVersionManifest(upgrade.manifest, header)
    };
    if (req.wshJar) {
      try {
        const deps = parseWshDependencies(await this.readWshDependencies(distro, req.wshJar.trim()));
        result.wshCheck = checkManifestAgainstWsh(upgrade.manifest, deps);
      } catch (err: any) {
        result.wshError = `Não foi possível ler o dependencies.json de ${req.wshJar}: ${err?.message || err}`;
      }
    }
    return result;
  }

  /** Grava `linux-winthor/versions/<versão>.features` (LF, lido no Linux pelo build). */
  public saveManifest(req: { infrPath?: string; targetVersion: string; manifestText: string }): { success: boolean; path?: string; error?: string } {
    const target = req.targetVersion?.trim();
    if (!isValidWinthorVersion(target)) return { success: false, error: 'Versão alvo inválida.' };
    if (!parseVersionManifest(req.manifestText || '').features.length) return { success: false, error: 'Manifesto vazio.' };
    const infr = this.wsl.resolveInfrPaths(req.infrPath);
    if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.' };
    const dir = path.join(infr.windows, 'linux-winthor', 'versions');
    if (!fs.existsSync(dir)) return { success: false, error: `Pasta não encontrada: ${dir}. A branch do INFR-Docker tem a imagem por versão?` };
    const file = path.join(dir, `${target}.features`);
    fs.writeFileSync(file, req.manifestText.replace(/\r\n/g, '\n'), 'utf-8');
    return { success: true, path: file };
  }
}
