import fs from 'fs';
import net from 'net';
import path from 'path';
import { isValidIdentifier } from '../../utils/security';
import { execWsl } from '../../utils/wslExec';
import {
  groupInfrEnvironments,
  isValidEnvName,
  isValidWinthorVersion,
  type InfrEnvironmentsResult
} from '../../../shared/infrWinthorVersion';
import {
  checkManifestAgainstWsh,
  compareManifests,
  manifestLineOf,
  parseVersionManifest,
  parseWshDependencies,
  rewriteFeatureVersions,
  addManifestRepos,
  serializeVersionManifest,
  upgradeManifestFromCatalog,
  type InfrVersionPreview,
  type InfrVersionPreviewRequest,
  type ManifestRepoRepair
} from '../../../shared/infrVersionManifest';
import {
  buildArtifactProbeScript,
  featuresWithoutRepo,
  newRepoProbes,
  parseArtifactProbeOutput,
  maskUrlCredentials,
  parsePaxRepositories,
  type ArtifactReport
} from '../../../shared/infrFeatureArtifacts';
import { buildDryRunCommands, parseDryRunOutput, type DryRunReport } from '../../../shared/infrDryRun';
import {
  buildPreflightScript,
  describePreflight,
  evaluatePreflight,
  expectedPorts,
  parsePreflightOutput,
  type PreflightItem,
  type PreflightSnapshot
} from '../../../shared/infrPreflight';
import { KARAF_CONTAINER_CLIENT } from '../../utils/karafDockerUtils';
import { mergeDependencyFixes, resolveDependencies } from '../../../shared/infrFeatureDependencies';
import { buildEnvFile, envFieldsFor, parseEnvLines, pickEnv, type InfrEnvTarget } from '../../../shared/infrEnvConfig';
import type { InfrEnvSaveRequest, InfrEnvTemplate, InfrManifestSaveRequest, InfrManifestSaveResult } from '../../../shared/infrVersionManifest';
import { INFR_NEW_VERSION_SCRIPTS, commandFailureDetail, missingNewVersionScriptsMessage, originContainerMessage } from '../../../shared/infrNewVersionScripts';
import { previewClone, readBuildState } from './infrClonePreview';
import { checkXmlDependencies } from './infrXmlDependencies';
import { repairAbsentFeatures, withXmlDependencies } from '../../../shared/infrFeatureXml';
import type { Routine801Service } from '../Routine801Service';
import type { WslService } from '../WslService';

type Trace = (line: string) => void;

/** O roteiro numa linha só, para o registro (o comando de verdade leva o roteiro em base64). */
const scriptLabel = (script: string) => {
  const oneLine = maskUrlCredentials(script).split(/\r?\n/).filter(Boolean).join(' ⏎ ');
  return oneLine.length > 700 ? `${oneLine.slice(0, 700)}…` : oneLine;
};

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

  private async run(distro: string, script: string, timeout = 120000, trace?: Trace, label?: string): Promise<string> {
    trace?.(`wsl -d ${distro}: ${label ?? script}`);
    const started = Date.now();
    try {
      const { stdout, stderr } = await execWsl(['-d', distro, '--', 'bash', '-c', script], { timeout, maxBuffer: 16 * 1024 * 1024 });
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
    if (req.cloneOnly) {
      return previewClone(
        { wsl: this.wsl, run: (d, s, t, tr) => this.run(d, s, t, tr), preflight: (d, v, r, tr, p) => this.preflight(d, v, r, tr, p) },
        req,
        trace
      );
    }
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
    // O export_features.sh sai calado quando o container está parado (set -e no docker exec): checa antes
    const status = (await this.run(distro, `docker inspect -f '{{.State.Status}}' ${container} 2>/dev/null || echo missing`, 20000, trace).catch(() => '')).trim();
    const stopped = originContainerMessage(container, status);
    if (stopped) return { success: false, error: stopped };
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
    trace(`Origem: ${origin.features.length} features, ${origin.repos.length} repositórios, linha ${manifestLineOf(origin) ?? '?'}`);
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

    const upgraded = upgradeManifestFromCatalog(origin, catalog, parseInt(target, 10));
    const resolved = resolveDependencies(upgraded, catalog, parseInt(target, 10));
    const upgrade = { ...upgraded, manifest: resolved.manifest, changes: mergeDependencyFixes(upgraded.changes, resolved.fixes) };
    const dep = resolved.report;
    trace(
      `Dependências: ${dep.checked} features conferidas, ${dep.withDependencies} declaram dependências, ${dep.fixed} ajustadas, ${dep.issues.length} pendentes` +
        (dep.sample ? `; exemplo do catálogo: ${dep.sample}` : '')
    );
    const header = [
      `WinThor ${target} — features da versão`,
      `Gerado pelo Hub Manager em ${new Date().toISOString().slice(0, 10)} a partir do ambiente ${from}`,
      `e do catálogo de atualizações da rotina 801 (${upgrade.changes.length} atualizadas, ${upgrade.behind.length} sem versão da linha ${target}).`
    ];
    const existingFile = this.manifestPath(infr.windows, target);
    const existingText = fs.existsSync(existingFile) ? fs.readFileSync(existingFile, 'utf-8') : null;
    const existing = existingText !== null ? parseVersionManifest(existingText) : null;
    const repositories = await this.karafRepositories(distro, container, trace);
    // Os features.xml das duas listas: a feature que nenhum repositório da lista tem quebra o build em "não existe em nenhum repositório"
    const xmlDeps = await checkXmlDependencies((script, ms) => this.runScriptInContainer(distro, container, script, ms), repositories, upgrade.manifest, trace, existing);
    const fixed = xmlDeps.absent ? repairAbsentFeatures(upgrade.manifest, xmlDeps.absent, catalog) : null;
    const manifest = fixed?.manifest ?? upgrade.manifest;
    const changes = fixed ? upgrade.changes.map((c) => ({ ...c, to: manifest.features.find((f) => f.name === c.name)?.version ?? c.to })).filter((c) => c.to !== c.from) : upgrade.changes;
    const result: InfrVersionPreview = {
      success: true,
      originWtaUrl: url,
      originCount: origin.features.length,
      originLine: manifestLineOf(origin),
      upgrade: { changes, behind: upgrade.behind, skipped: upgrade.skipped },
      dependencies: withXmlDependencies(dep, xmlDeps),
      artifacts: await this.checkArtifacts(distro, container, repositories, origin, manifest, catalog, changes, trace),
      preflight: await this.preflight(distro, target, repositories, trace),
      buildState: await readBuildState((d, s, t, tr) => this.run(d, s, t, tr), distro, req, trace),
      manifestText: serializeVersionManifest(manifest, header),
      ...(fixed ? { repair: { repairs: fixed.repairs, added: fixed.added, kept: fixed.kept } } : {})
    };
    const repairTrace = (label: string, r: ManifestRepoRepair) =>
      trace(
        `Features sem repositório (${label}): ${r.added.length} com repositório da 801 (${r.added.map((a) => a.name).join(', ') || '-'}), ` +
          `${r.repairs.length} voltam para a versão dos repositórios, ${r.kept.length} ficam na versão atual (${r.kept.map((k) => `${k.name} ${k.version}`).join(', ') || '-'})`
      );
    if (result.repair) repairTrace('lista nova', result.repair);
    trace(`Manifesto: ${changes.length} sobem, ${upgrade.behind.length} sem versão da linha ${target}; ${existingFile} ${existing ? `já existe (${existing.features.length} features)` : 'não existe'}`);
    // A lista existente como a criação vai gravá-la: com as features sem repositório de volta à versão que os repositórios dela têm
    let existingFinal = existing;
    if (existing?.features.length) {
      result.existing = { path: existingFile, count: existing.features.length, comparison: compareManifests(existing, manifest) };
      if (xmlDeps.existingAbsent && existingText !== null) {
        const r = repairAbsentFeatures(existing, xmlDeps.existingAbsent, catalog);
        existingFinal = r.manifest;
        result.existing.repair = { repairs: r.repairs, added: r.added, kept: r.kept };
        repairTrace('lista existente', result.existing.repair);
        if (r.repairs.length || r.added.length) result.existing.repairText = addManifestRepos(rewriteFeatureVersions(existingText, r.repairs), r.added.map((a) => a.repo));
      }
    }
    if (req.wshJar) {
      try {
        const deps = parseWshDependencies(await this.readWshDependencies(distro, req.wshJar.trim(), trace));
        trace(`WSH exige ${deps.length} serviços`);
        result.wshCheck = checkManifestAgainstWsh(manifest, deps);
        if (result.existing && existingFinal) result.existing.wshCheck = checkManifestAgainstWsh(existingFinal, deps);
      } catch (err: any) {
        result.wshError = `Não foi possível ler o dependencies.json de ${req.wshJar}: ${commandFailureDetail(err)}`;
      }
    }
    if (req.dryRun) result.dryRun = await this.dryRun(distro, container, newRepoProbes(manifest, origin).map((p) => p.mvn), changes, trace);
    return result;
  }

  /**
   * Os repositórios novos da lista existem no Nexus? Testado de dentro do wta-<origem> (mesma rede e mesmo acesso que o
   * build terá), nos repositórios que o próprio Karaf usa. Nunca derruba a prévia: o que não der para conferir vira aviso.
   */
  private async checkArtifacts(
    distro: string,
    container: string,
    repositories: string[] | null,
    origin: Parameters<typeof newRepoProbes>[1],
    manifest: Parameters<typeof newRepoProbes>[0],
    catalog: Parameters<typeof featuresWithoutRepo>[1],
    changes: Parameters<typeof featuresWithoutRepo>[2],
    trace: Trace
  ): Promise<ArtifactReport> {
    const probes = newRepoProbes(manifest, origin);
    const withoutRepo = featuresWithoutRepo(manifest, catalog, changes);
    let report: ArtifactReport = { checked: 0, missing: [], unverified: 0, repositories: [], withoutRepo };
    if (probes.length === 0) {
      trace('Artefatos: a lista não acrescentou repositórios novos');
      return report;
    }
    try {
      if (!repositories?.length) return { ...report, checked: probes.length, unverified: probes.length, error: 'o Karaf não lista repositórios http (ou o container não deixou ler o org.ops4j.pax.url.mvn.cfg)' };
      const out = await this.runScriptInContainer(distro, container, buildArtifactProbeScript(repositories, probes), 180000);
      report = { ...parseArtifactProbeOutput(out, probes, repositories.map(maskUrlCredentials)), withoutRepo };
      trace(`Resposta por artefato: ${out.trim().split(/\r?\n/).join(' | ') || '(vazia)'}`);
      trace(`Artefatos: ${report.checked} testados, ${report.missing.length} ausentes, ${report.unverified} sem resposta`);
    } catch (err: any) {
      trace(`Artefatos não conferidos: ${commandFailureDetail(err)}`);
      report = { ...report, checked: probes.length, unverified: probes.length, error: commandFailureDetail(err) };
    }
    return report;
  }

  /**
   * Roda um script (bash) na distro. O wsl.exe expande o `$` antes de chegar ao bash, mesmo entre aspas simples, então
   * o script vai em base64 e é decodificado dentro da distro: nada do que há nele passa por outro shell.
   */
  private runScript(distro: string, script: string, timeout: number, trace?: Trace): Promise<string> {
    return this.run(distro, `echo ${Buffer.from(script).toString('base64')} | base64 -d | bash`, timeout, trace, scriptLabel(script));
  }

  /** Igual ao runScript, mas dentro do container: o script vai para um arquivo e roda com `sh`, sem disputar o stdin. */
  private runScriptInContainer(distro: string, container: string, script: string, timeout: number, trace?: Trace): Promise<string> {
    const file = '/tmp/hub-script.sh';
    const b64 = Buffer.from(script).toString('base64');
    return this.run(
      distro,
      `echo ${b64} | base64 -d | docker exec -i ${container} sh -c 'cat > ${file}' && docker exec ${container} sh ${file} < /dev/null; docker exec ${container} rm -f ${file}`,
      timeout,
      trace,
      `docker exec ${container} sh (roteiro): ${scriptLabel(script)}`
    );
  }

  /** Repositórios http que o Karaf do container usa (org.ops4j.pax.url.mvn.cfg); null se não deu para ler. */
  private async karafRepositories(distro: string, container: string, trace: Trace): Promise<string[] | null> {
    try {
      const cfg = await this.run(distro, `docker exec ${container} sh -c 'cat /opt/pcsist/produtos/winthor/etc/org.ops4j.pax.url.mvn.cfg'`, 30000);
      const repositories = parsePaxRepositories(cfg);
      trace(`Repositórios do Karaf: ${repositories.map(maskUrlCredentials).join(', ') || '(nenhum http no org.ops4j.pax.url.mvn.cfg)'}`);
      return repositories;
    } catch (err: any) {
      trace(`Repositórios do Karaf não lidos: ${commandFailureDetail(err)}`);
      return null;
    }
  }

  /** Porta livre no Windows? Quem ocupa (um programa, um proxy) impede o `docker run -p` de publicar. */
  private portFreeOnWindows(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, '0.0.0.0');
    });
  }

  /** Portas, disco, memória e Nexus: o que costuma derrubar o build ou o primeiro boot, lido em segundos. */
  private async preflight(distro: string, target: string, repositories: string[] | null, trace: Trace, ports?: InfrVersionPreviewRequest['ports']): Promise<PreflightItem[]> {
    let snap: PreflightSnapshot = { usedPorts: [] };
    try {
      snap = parsePreflightOutput(await this.runScript(distro, buildPreflightScript(repositories ?? []), 60000));
    } catch (err: any) {
      trace(`Pré-checagem na distro falhou: ${commandFailureDetail(err)}`);
    }
    const windowsUsed: number[] = [];
    for (const e of expectedPorts(target, ports)) if (!(await this.portFreeOnWindows(e.port))) windowsUsed.push(e.port);
    describePreflight(snap, windowsUsed).forEach((l) => trace(l));
    const items = evaluatePreflight(target, snap, windowsUsed, ports);
    trace(`Pré-checagem: ${items.map((i) => `${i.id}=${i.status}`).join(', ')}`);
    return items;
  }

  /**
   * Ensaio da resolução no Karaf do WTA de origem: acrescenta os repositórios novos, simula (-t) cada feature trocada e
   * retira os repositórios. Um comando por chamada do cliente, porque o primeiro erro interromperia um roteiro (-f) e
   * deixaria os repositórios acrescentados na origem.
   */
  private async dryRun(distro: string, container: string, newRepos: string[], changes: { name: string; to: string }[], trace: Trace): Promise<DryRunReport> {
    const MAX = 40;
    const commands = buildDryRunCommands(newRepos, changes.slice(0, MAX));
    const simulated = commands.filter((c) => c.startsWith('feature:install')).length;
    if (simulated === 0) {
      trace('Ensaio: nenhuma feature trocada para simular');
      return { simulated: 0, errors: [], tail: [], skipped: 'nenhuma feature trocada' };
    }
    if (changes.length > MAX) trace(`Ensaio limitado às ${MAX} primeiras das ${changes.length} features trocadas`);
    // Um comando por linha de um arquivo (o cliente não pode ler o stdin do roteiro)
    const list = commands.join('\n');
    const script = `cat > /tmp/hub-ensaio.txt <<'HUB_EOF'\n${list}\nHUB_EOF\nwhile IFS= read -r l; do echo "> $l"; ${KARAF_CONTAINER_CLIENT} "$l" < /dev/null 2>&1; done < /tmp/hub-ensaio.txt\nrm -f /tmp/hub-ensaio.txt\n`;
    trace(`Ensaio: ${simulated} features, ${newRepos.length} repositórios acrescentados e retirados do Karaf de ${container}`);
    try {
      const out = await this.runScriptInContainer(distro, container, script, 600000);
      const report = parseDryRunOutput(out, simulated);
      trace(`Ensaio: ${report.errors.length} erro(s) do Karaf${report.errors.length ? `: ${report.errors.join(' | ')}` : ''}`);
      trace(`Fim da saída do ensaio: ${report.tail.join(' | ')}`);
      if (report.skipped) trace(`Ensaio não concluído: ${report.skipped}`);
      return report;
    } catch (err: any) {
      const reason = commandFailureDetail(err);
      trace(`Ensaio não rodou: ${reason}`);
      return { simulated, errors: [], tail: [], skipped: reason };
    }
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
    // Substituir guarda a lista anterior ao lado (.bak não é lido pelo build), para dar para voltar
    if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`);
    fs.writeFileSync(file, req.manifestText.replace(/\r\n/g, '\n'), 'utf-8');
    return { success: true, path: file };
  }
}
