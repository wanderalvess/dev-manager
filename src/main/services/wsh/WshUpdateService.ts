import fs from 'fs';
import os from 'os';
import path from 'path';
import { isValidIdentifier } from '../../utils/security';
import { execWsl } from '../../utils/wslExec';
import { KARAF_CONTAINER_CLIENT } from '../../utils/karafDockerUtils';
import { parseInstalledFeaturesOutput } from '../../utils/karafListParsers';
import { parseWshDependencies } from '../../../shared/infrVersionManifest';
import {
  checkRequiredFeatures,
  compareWshVersions,
  envValue,
  isSafeWshJarPath,
  isValidWshVersion,
  mountedJarSource,
  parseJarManifest,
  wshJarBackupPath,
  WSH_STARTED_MARKER,
  type WshRequiredFeature,
  type WshUpdateApplyResult,
  type WshUpdateInspectResult,
  type WshUpdateProbeResult,
  type WshUpdateProgress,
  type WshUpdatePrepareResult,
  type WshUpdateRequest
} from '../../../shared/wshUpdate';
import { downloadInstaller, probeInstaller } from './wshInstallerDownload';
import { extractFromArchive } from './sevenZipExtract';
import { rebuildJarFromPack } from './wshInstallerPack';

type Progress = (p: WshUpdateProgress) => void;

const JAR_NAME = 'winthor-integracao-core.jar';
/** Lê, de dentro do jar, o manifest, as dependências e os backups ao lado dele (uma linha: vai como argumento de bash -c). */
const READ_JAR_PY =
  "import zipfile,sys,glob,os,json;j=sys.argv[1];z=zipfile.ZipFile(j);n=z.namelist();r=lambda x:z.read(x).decode('utf8','replace') if x in n else '';print(json.dumps({'m':r('META-INF/MANIFEST.MF'),'d':r('BOOT-INF/classes/dependencies.json'),'b':[os.path.basename(p) for p in sorted(glob.glob(j+'.bak-*'),key=os.path.getmtime,reverse=True)]}))";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Atualiza o jar do WSH de um container: baixa o instalador oficial da TOTVS, tira o jar de dentro dele, confere o
 * que ele exige do WTA e troca o arquivo montado no container (com backup ao lado), reiniciando em seguida.
 */
export class WshUpdateService {
  constructor(
    private readonly findDistro: () => Promise<string | undefined>,
    private readonly stageRoot: string = path.join(os.tmpdir(), 'hub-manager-wsh-update')
  ) {}

  private async distroOf(req: WshUpdateRequest): Promise<string | null> {
    const distro = req.distro || (await this.findDistro()) || 'ubuntu2604-winthor';
    return isValidIdentifier(distro) ? distro : null;
  }

  private async wsl(distro: string, args: string[], timeout = 60000): Promise<string> {
    const { stdout } = await execWsl(['-d', distro, '--', ...args], { timeout, maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  }

  private stageDir(version: string): string {
    return path.join(this.stageRoot, version);
  }

  public probe(version: string): Promise<WshUpdateProbeResult> {
    if (!isValidWshVersion(version)) return Promise.resolve({ success: false, error: 'Versão inválida. Use o formato 1.39.22.31.' });
    return probeInstaller(version.trim());
  }

  /** Jar em uso, versão, o que ele exige do WTA e backups, lidos do container e do arquivo montado nele. */
  public async inspect(req: WshUpdateRequest): Promise<WshUpdateInspectResult> {
    if (!isValidIdentifier(req.container)) return { success: false, error: 'Nome de container inválido.' };
    const distro = await this.distroOf(req);
    if (!distro) return { success: false, error: 'Distro WSL inválida.' };
    try {
      const raw = await this.wsl(distro, ['docker', 'inspect', req.container]);
      const info = JSON.parse(raw)[0];
      const mounts = (info?.Mounts || []).map((m: any) => `${m.Source}|${m.Destination}`).join('\n');
      const jarPath = mountedJarSource(mounts);
      if (!jarPath) return { success: false, error: 'Este container não monta o jar do WSH (esperado em /opt/winthor-integracao-core). Ele foi criado pelo wsh_setup.sh?', distro, container: req.container };
      const read = JSON.parse((await this.wsl(distro, ['bash', '-c', `python3 -I -c "${READ_JAR_PY}" '${jarPath}'`], 30000)).trim());
      const requires = parseWshDependencies(read.d || '[]').map(({ service, version }) => ({ service, version }));
      return {
        success: true,
        distro,
        container: req.container,
        running: !!info?.State?.Running,
        jarPath,
        version: parseJarManifest(read.m || '').version,
        requires,
        wtaContainer: envValue((info?.Config?.Env || []).join('\n'), 'WTA_CONTAINER'),
        backups: read.b || []
      };
    } catch (err: any) {
      return { success: false, error: `Não foi possível ler o container ${req.container}: ${String(err?.stderr || err?.message || err).trim().slice(0, 300)}` };
    }
  }

  /** Features que o WTA tem instaladas, para conferir o que o jar novo exige. */
  private async wtaFeatures(distro: string, wta: string): Promise<{ name: string; version: string }[]> {
    const out = await this.wsl(distro, ['docker', 'exec', wta, KARAF_CONTAINER_CLIENT, 'feature:list -i'], 90000);
    return parseInstalledFeaturesOutput(out).map((f) => ({ name: f.name, version: f.version }));
  }

  /** Baixa o instalador, extrai o jar, confere a versão e o que ele exige do WTA. Nada no container muda aqui. */
  public async prepare(req: WshUpdateRequest, onProgress: Progress = () => {}): Promise<WshUpdatePrepareResult> {
    const version = req.version?.trim() ?? '';
    if (!isValidWshVersion(version)) return { success: false, error: 'Versão inválida. Use o formato 1.39.22.31.' };
    const current = await this.inspect(req);
    if (!current.success) return { success: false, error: current.error };
    const dir = this.stageDir(version);
    try {
      fs.mkdirSync(dir, { recursive: true });
      const exe = path.join(dir, 'installer.exe');
      const size = fs.existsSync(exe) ? fs.statSync(exe).size : 0;
      if (!size) {
        onProgress({ step: 'download', message: `Baixando o instalador ${version}…`, percent: 0 });
        await downloadInstaller(version, exe, (percent, done) =>
          onProgress({ step: 'download', message: `Baixando o instalador… ${(done / 1048576).toFixed(0)} MB`, percent })
        );
      }

      onProgress({ step: 'extract', message: 'Abrindo o instalador (alguns segundos)…' });
      const packDir = path.join(dir, 'packs');
      fs.rmSync(packDir, { recursive: true, force: true });
      fs.mkdirSync(packDir, { recursive: true });
      await extractFromArchive(exe, dir, ['WSH-setup-*.jar']);
      const izpack = fs.readdirSync(dir).find((f) => /^WSH-setup-.*\.jar$/.test(f));
      if (!izpack) throw new Error('O instalador não tem o pacote esperado (WSH-setup-*.jar).');
      await extractFromArchive(path.join(dir, izpack), packDir, ['resources/packs/pack-*']);
      // O pack do WSH é o maior; os outros guardam só arquivos de configuração
      const packs = fs.readdirSync(packDir).map((f) => ({ f, size: fs.statSync(path.join(packDir, f)).size })).sort((a, b) => b.size - a.size);
      if (!packs.length) throw new Error('O instalador não traz o pacote do WSH.');
      const rebuilt = rebuildJarFromPack(fs.readFileSync(path.join(packDir, packs[0].f)));
      fs.rmSync(path.join(dir, izpack), { force: true });
      fs.rmSync(packDir, { recursive: true, force: true });

      const manifest = parseJarManifest(rebuilt.files['META-INF/MANIFEST.MF']?.toString('utf8') || '');
      if (manifest.version !== version) throw new Error(`O instalador traz a versão ${manifest.version ?? 'desconhecida'}, não a ${version}.`);
      fs.writeFileSync(path.join(dir, JAR_NAME), rebuilt.jar);

      const requires: WshRequiredFeature[] = parseWshDependencies(rebuilt.files['BOOT-INF/classes/dependencies.json']?.toString('utf8') || '[]').map(({ service, version: v }) => ({ service, version: v }));
      const result: WshUpdatePrepareResult = { success: true, version, verdict: compareWshVersions(current.version, version), sizeBytes: rebuilt.jar.length, requires };
      onProgress({ step: 'check', message: 'Conferindo as features do WTA…' });
      if (!current.wtaContainer || !isValidIdentifier(current.wtaContainer)) {
        result.checksError = 'Não achei o container do WTA (variável WTA_CONTAINER do WSH).';
      } else {
        try {
          result.checks = checkRequiredFeatures(requires, await this.wtaFeatures(current.distro!, current.wtaContainer));
        } catch (err: any) {
          result.checksError = `Não consegui ler as features de ${current.wtaContainer}: ${String(err?.stderr || err?.message || err).trim().slice(0, 200)}`;
        }
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  private async restartAndWait(distro: string, container: string, onProgress: Progress): Promise<{ started: boolean; logTail: string }> {
    onProgress({ step: 'restart', message: `Reiniciando ${container}…` });
    const since = new Date(Date.now() - 2000).toISOString();
    await this.wsl(distro, ['docker', 'restart', container], 90000);
    const deadline = Date.now() + 180000;
    let logs = '';
    while (Date.now() < deadline) {
      onProgress({ step: 'wait', message: 'Esperando o WSH subir…' });
      await sleep(4000);
      logs = await this.wsl(distro, ['bash', '-c', `docker logs --since '${since}' '${container}' 2>&1 | tail -n 40`], 30000).catch(() => logs);
      if (logs.includes(WSH_STARTED_MARKER)) return { started: true, logTail: logs };
      const state = await this.wsl(distro, ['docker', 'inspect', '-f', '{{.State.Running}}', container], 20000).catch(() => 'true');
      if (state.trim() === 'false') break;
    }
    return { started: false, logTail: logs };
  }

  /** Troca o jar montado pelo preparado (guarda o antigo ao lado) e reinicia o container. */
  public async apply(req: WshUpdateRequest, onProgress: Progress = () => {}): Promise<WshUpdateApplyResult> {
    const version = req.version?.trim() ?? '';
    if (!isValidWshVersion(version)) return { success: false, error: 'Versão inválida.' };
    const staged = path.join(this.stageDir(version), JAR_NAME);
    if (!fs.existsSync(staged)) return { success: false, error: 'O jar não está preparado. Clique em "Baixar e conferir" antes.' };
    const current = await this.inspect(req);
    if (!current.success || !current.distro || !current.jarPath || !isSafeWshJarPath(current.jarPath)) return { success: false, error: current.error || 'Jar atual não encontrado.' };
    const { distro, jarPath } = current;
    try {
      onProgress({ step: 'apply', message: 'Guardando o jar atual e gravando o novo…' });
      const src = (await this.wsl(distro, ['wslpath', '-a', '-u', staged], 20000)).trim();
      if (!/^\/[^\n'\\]+$/.test(src)) throw new Error('Não consegui converter o caminho do jar preparado para o WSL.');
      const backup = wshJarBackupPath(jarPath, current.version);
      await execWsl(['-d', distro, '-u', 'root', '--', 'bash', '-c', `set -e; cp -p '${jarPath}' '${backup}'; cp '${src}' '${jarPath}.new'; chmod 644 '${jarPath}.new'; mv -f '${jarPath}.new' '${jarPath}'`], { timeout: 120000 });
      const { started, logTail } = await this.restartAndWait(distro, req.container, onProgress);
      return { success: true, started, backup: path.posix.basename(backup), logTail };
    } catch (err: any) {
      return { success: false, error: `Não foi possível trocar o jar: ${String(err?.stderr || err?.message || err).trim().slice(0, 300)}` };
    }
  }

  /** Volta ao backup escolhido (por padrão, o mais recente) e reinicia o container. */
  public async rollback(req: WshUpdateRequest & { backup?: string }, onProgress: Progress = () => {}): Promise<WshUpdateApplyResult> {
    const current = await this.inspect(req);
    if (!current.success || !current.distro || !current.jarPath || !isSafeWshJarPath(current.jarPath)) return { success: false, error: current.error || 'Jar atual não encontrado.' };
    const backup = req.backup || current.backups?.[0];
    if (!backup || !/^[A-Za-z0-9._-]+$/.test(backup) || !current.backups?.includes(backup)) return { success: false, error: 'Não há backup do jar para restaurar.' };
    const { distro, jarPath } = current;
    const backupPath = `${path.posix.dirname(jarPath)}/${backup}`;
    try {
      onProgress({ step: 'apply', message: `Restaurando ${backup}…` });
      await execWsl(['-d', distro, '-u', 'root', '--', 'bash', '-c', `set -e; cp '${backupPath}' '${jarPath}.new'; chmod 644 '${jarPath}.new'; mv -f '${jarPath}.new' '${jarPath}'`], { timeout: 120000 });
      const { started, logTail } = await this.restartAndWait(distro, req.container, onProgress);
      return { success: true, started, backup, logTail };
    } catch (err: any) {
      return { success: false, error: `Não foi possível restaurar o jar: ${String(err?.stderr || err?.message || err).trim().slice(0, 300)}` };
    }
  }
}
