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
  compareManifests,
  parseVersionManifest,
  parseWshDependencies,
  serializeVersionManifest,
  upgradeManifestFromCatalog,
  type InfrVersionPreview,
  type InfrVersionPreviewRequest
} from '../../../shared/infrVersionManifest';
import { buildEnvFile, envFieldsFor, parseEnvLines, pickEnv, type InfrEnvTarget } from '../../../shared/infrEnvConfig';
import type { InfrEnvSaveRequest, InfrEnvTemplate, InfrManifestSaveRequest, InfrManifestSaveResult } from '../../../shared/infrVersionManifest';
import { INFR_NEW_VERSION_SCRIPTS, commandFailureDetail, missingNewVersionScriptsMessage } from '../../../shared/infrNewVersionScripts';
import type { Routine801Service } from '../Routine801Service';
import type { WslService } from '../WslService';

type Trace = (line: string) => void;

const WSL_FILE =/^\/[a-zA-Z0-9_./-]+$/;
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

  private async run(distro: string, script: string, timeout = 120000, trace?: Trace): Promise<string> {
    trace?.(`wsl -d ${distro}: ${script}`);
    const started = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync('wsl.exe', ['-d', distro, '--', 'bash', '-c', script], {
        timeout,
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024
      });
      trace?.(`ok em ${Date.now() - started} ms${String(stderr || '').trim() ? `; stderr: ${commandFailureDetail({ stderr })}` : ''}`);
      return String(stdout);
    } catch (err: any) {
      trace?.(`falhou em ${Date.now() - started} ms (código ${err?.code ?? '?'}${err?.killed ? ', tempo esgotado' : ''}): ${commandFailureDetail(err, 15)}`);
      throw err;
    }
  }

  /** URL do WTA de origem pela porta publicada da 8080 do container (o WSL2 encaminha o localhost). */
  private async originUrl(distro: string, container: string, trace?: Trace): Promise<string | null> {
    const out = await this.run(distro, `docker port ${container} 8080 2>/dev/null | head -1`, 20000, trace);
    const port = /:(\d{2,5})\s*$/.exec(out.trim())?.[1];
    return port ? `http://localhost:${port}` : null;
  }

  private async readWshDependencies(distro: string, jar: string, trace?: Trace): Promise<string> {
    const py = "import zipfile,sys;print(zipfile.ZipFile(sys.argv[1]).read('BOOT-INF/classes/dependencies.json').decode())";
    return this.run(distro, `python3 -I -c "${py}" '${jar}'`, 30000, trace);
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
      return { success: false, error: `Não foi possível listar os containers da distro ${distro}: ${commandFailureDetail(err)}`, distro, ...empty };
    }
  }

  /** Prévia com o registro de cada passo (comandos, HTTP, login), para a tela mostrar e copiar. */
  public async preview(req: InfrVersionPreviewRequest): Promise<InfrVersionPreview> {
    const log: string[] = [];
    const trace: Trace = (line) => {
      log.push(`${new Date().toTimeString().slice(0, 8)} ${line}`);
      console.log('[InfrVersion]', line);
    };
    trace(`Prévia: origem ${req.fromEnv}, versão ${req.targetVersion}, distro ${req.distro || '(detectar)'}, pasta ${req.infrPath || '(detectar)'}`);
    let result: InfrVersionPreview;
    try {
      result = await this.previewSteps(req, trace);
    } catch (err: any) {
      result = { success: false, error: `Erro inesperado na prévia: ${err?.message || err}` };
    }
    trace(result.success ? 'Prévia concluída' : `Prévia parou: ${result.error}`);
    return { ...result, log };
  }

  private async previewSteps(req: InfrVersionPreviewRequest, trace: Trace): Promise<InfrVersionPreview> {
    const target = req.targetVersion?.trim();
    if (!isValidWinthorVersion(target)) return { success: false, error: 'Versão alvo inválida (ex.: 40).' };
    if (!isValidEnvName(req.fromEnv)) return { success: false, error: 'Ambiente de origem inválido (ex.: master).' };
    if (req.wshJar && !WSL_FILE.test(req.wshJar.trim())) return { success: false, error: 'Caminho do jar do WSH inválido.' };
    if (req.originWtaUrl && !SAFE_URL.test(req.originWtaUrl.trim())) return { success: false, error: 'URL do WTA de origem inválida.' };
    const distro = req.distro || (await this.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(distro)) return { success: false, error: 'Distro WSL inválida.' };
    const infr = this.wsl.resolveInfrPaths(req.infrPath);
    if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.' };

    trace(`Distro ${distro}; pasta do INFR-Docker ${infr.windows} (${infr.wsl})`);
    const missing = INFR_NEW_VERSION_SCRIPTS.filter((s) => !fs.existsSync(path.join(infr.windows, s)));
    trace(missing.length ? `Scripts que faltam: ${missing.join(', ')}` : 'Scripts da Nova versão encontrados');
    if (missing.length > 0) return { success: false, error: missingNewVersionScriptsMessage(infr.windows, missing) };

    const from = req.fromEnv.trim();
    const container = `wta-${from}`;
    const tmp = `/tmp/hub-origem-${from}.features`;
    let originText: string;
    try {
      await this.run(
        distro,
        `cd "${infr.wsl}/linux-winthor" && bash scripts/export_features.sh --version ${target} --container ${container} --out ${tmp}`,
        180000,
        trace
      );
      originText = await this.run(distro, `cat ${tmp}`, 20000);
    } catch (err: any) {
      return { success: false, error: `Não foi possível ler as features do ${container}: ${commandFailureDetail(err)}` };
    }
    const origin = parseVersionManifest(originText);
    trace(`Origem: ${origin.features.length} features, ${origin.repos.length} repositórios`);
    if (origin.features.length === 0) {
      return { success: false, error: `O ${container} não devolveu features. Ele está rodando e com o Karaf de pé?` };
    }

    const url = req.originWtaUrl?.trim() || (await this.originUrl(distro, container, trace));
    trace(`URL do WTA de origem: ${url || '(porta 8080 não publicada)'}${req.originWtaUrl ? ' (informada na tela)' : ''}`);
    if (!url) return { success: false, error: `Porta 8080 do ${container} não publicada; informe a URL do WTA de origem.` };
    let catalog;
    try {
      catalog = await this.routine801.fetchUpdates(url, trace, parseInt(target, 10));
      trace(`Catálogo da 801: ${catalog.funcionalidades.length} features, ${catalog.repositorios.length} repositórios`);
    } catch (err: any) {
      const msg = String(err?.message || err);
      const howTo = /recusado pelo WTA/.test(msg)
        ? ' Como resolver: confira o usuário e a senha em Configurações → Rotinas WinThor → Usuário WTA (Login Automático). O usuário precisa existir no banco do ambiente de origem, com a senha que entra no WinThor.'
        : /HTTP 40[13]/.test(msg)
          ? ' Como resolver: o WTA pede login para o catálogo. Informe o usuário e a senha do WinThor em Configurações → Rotinas WinThor → Usuário WTA (Login Automático); o Hub entra no WTA de origem com eles.'
          : '';
      return { success: false, error: `Catálogo da rotina 801 em ${url}: ${msg}.${howTo}`, originWtaUrl: url };
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
    const existingFile = this.manifestPath(infr.windows, target);
    const existing = fs.existsSync(existingFile) ? parseVersionManifest(fs.readFileSync(existingFile, 'utf-8')) : null;
    trace(`Manifesto: ${upgrade.changes.length} sobem, ${upgrade.behind.length} sem versão da linha ${target}; ${existingFile} ${existing ? `já existe (${existing.features.length} features)` : 'não existe'}`);
    if (existing?.features.length) {
      result.existing = { path: existingFile, count: existing.features.length, comparison: compareManifests(existing, upgrade.manifest) };
    }
    if (req.wshJar) {
      try {
        const deps = parseWshDependencies(await this.readWshDependencies(distro, req.wshJar.trim(), trace));
        trace(`WSH exige ${deps.length} serviços`);
        result.wshCheck = checkManifestAgainstWsh(upgrade.manifest, deps);
        if (result.existing && existing) result.existing.wshCheck = checkManifestAgainstWsh(existing, deps);
      } catch (err: any) {
        result.wshError = `Não foi possível ler o dependencies.json de ${req.wshJar}: ${commandFailureDetail(err)}`;
      }
    }
    return result;
  }

  private manifestPath(infrWindows: string, version: string): string {
    return path.join(infrWindows, 'linux-winthor', 'versions', `${version}.features`);
  }

  /** Ambiente do container (KEY=valor por linha) e, no WSH, o Winthor.ini montado. */
  private async containerEnv(distro: string, container: string, target: InfrEnvTarget): Promise<Record<string, string> | null> {
    try {
      const out = await this.run(distro, `docker inspect ${container} --format '{{range .Config.Env}}{{println .}}{{end}}'`, 20000);
      const env = pickEnv(target, parseEnvLines(out));
      if (target === 'wsh') {
        const ini = await this.run(
          distro,
          `docker inspect ${container} --format '{{range .Mounts}}{{if eq .Destination "/tmp/Winthor.ini"}}{{.Source}}{{end}}{{end}}'`,
          20000
        );
        if (ini.trim()) env.WINTHOR_INI = ini.trim();
      }
      return env;
    } catch {
      return null;
    }
  }

  /** Configuração do WTA e do WSH de origem para a tela (senhas sem o valor). */
  public async envTemplate(distroName: string | undefined, from: string): Promise<InfrEnvTemplate> {
    if (!isValidEnvName(from)) return { success: false, error: 'Ambiente de origem inválido.', wta: [], wsh: [] };
    const distro = distroName || (await this.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
    if (!isValidIdentifier(distro)) return { success: false, error: 'Distro WSL inválida.', wta: [], wsh: [] };
    const wta = await this.containerEnv(distro, `wta-${from.trim()}`, 'wta');
    if (!wta) return { success: false, error: `Não foi possível ler o ambiente do wta-${from}.`, wta: [], wsh: [] };
    const wsh = await this.containerEnv(distro, `wsh-${from.trim()}`, 'wsh');
    return { success: true, wta: envFieldsFor('wta', wta), wsh: envFieldsFor('wsh', wsh ?? {}), hasWsh: wsh !== null };
  }

  /**
   * Grava `linux-winthor/wta.env.<v>` e (com jar do WSH) `wsh-winthor/.env.<v>` a partir dos
   * containers de origem, com as edições do usuário; as senhas em branco vêm da origem, lidas aqui.
   */
  public async saveEnvFiles(req: InfrEnvSaveRequest): Promise<InfrManifestSaveResult> {
    const v = req.version?.trim();
    const { name, from } = req;
    if (!isValidWinthorVersion(v) || !isValidEnvName(name) || !isValidEnvName(from)) return { success: false, error: 'Versão ou ambiente inválido.' };
    const dbContainer = req.dbContainer?.trim() || `oracle-${name}`;
    if (!isValidEnvName(dbContainer)) return { success: false, error: 'Oracle inválido.' };
    if (req.wshJar && !WSL_FILE.test(req.wshJar)) return { success: false, error: 'Jar do WSH inválido.' };
    const distro = req.distro || (await this.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
    const infr = this.wsl.resolveInfrPaths(req.infrPath);
    if (!isValidIdentifier(distro) || !infr) return { success: false, error: 'Distro ou pasta do INFR-Docker inválida.' };
    const header = `Gerado pelo Hub Manager a partir do ambiente ${from} em ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    try {
      const wta = (await this.containerEnv(distro, `wta-${from}`, 'wta')) ?? {};
      const wtaFile = path.join(infr.windows, 'linux-winthor', `wta.env.${v}`);
      fs.writeFileSync(wtaFile, buildEnvFile(wta, req.wtaEdits ?? {}, { DB_HOST: dbContainer, DB_PORT: '1521' }, header), 'utf-8');
      if (!req.wshJar) return { success: true, path: wtaFile };
      const wsh = (await this.containerEnv(distro, `wsh-${from}`, 'wsh')) ?? {};
      const wshFile = path.join(infr.windows, 'wsh-winthor', `.env.${v}`);
      const fixed = {
        WSH_CONTAINER: `wsh-${name}`,
        ORACLE_CONTAINER: dbContainer,
        DB_HOST: dbContainer,
        WTA_CONTAINER: `wta-${name}`,
        WTA_HOST: `wta-${name}`,
        SERVER_PORT: String(req.wshPort || 9000 + parseInt(v, 10)),
        WSH_JAR: req.wshJar,
        WSH_LOGS_VOLUME: `wsh-${name}-logs`
      };
      fs.writeFileSync(wshFile, buildEnvFile(wsh, req.wshEdits ?? {}, fixed, header), 'utf-8');
      return { success: true, path: `${wtaFile} e ${wshFile}` };
    } catch (err: any) {
      return { success: false, error: `Não foi possível gravar a configuração: ${err?.message || err}` };
    }
  }

  /** Grava `linux-winthor/versions/<versão>.features` (LF, lido no Linux pelo build); só substitui com `overwrite`. */
  public saveManifest(req: InfrManifestSaveRequest): InfrManifestSaveResult {
    const target = req.targetVersion?.trim();
    if (!isValidWinthorVersion(target)) return { success: false, error: 'Versão alvo inválida.' };
    if (!parseVersionManifest(req.manifestText || '').features.length) return { success: false, error: 'Manifesto vazio.' };
    const infr = this.wsl.resolveInfrPaths(req.infrPath);
    if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.' };
    const dir = path.join(infr.windows, 'linux-winthor', 'versions');
    if (!fs.existsSync(dir)) return { success: false, error: `Pasta não encontrada: ${dir}. A branch do INFR-Docker tem a imagem por versão?` };
    const file = this.manifestPath(infr.windows, target);
    if (fs.existsSync(file) && !req.overwrite) {
      return { success: false, error: `${file} já existe. Escolha usar o manifesto existente ou substituí-lo pelo da prévia.` };
    }
    fs.writeFileSync(file, req.manifestText.replace(/\r\n/g, '\n'), 'utf-8');
    return { success: true, path: file };
  }
}
