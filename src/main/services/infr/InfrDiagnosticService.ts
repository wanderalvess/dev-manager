import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileAsync } from '../../utils/security';
import { execWsl } from '../../utils/wslExec';
import { buildLogPath } from '../../../shared/infrBuildLog';
import { parseWtaImage } from '../../../shared/infrClone';
import {
  buildCompactDiagnostic,
  buildDiagnosticReport,
  diagnosticProbeScript,
  maskEnvText,
  parseDiagnosticProbe,
  type DiagnosticFile,
  type DiagnosticInput,
  type DiagnosticScript
} from '../../../shared/infrDiagnostic';
import type { InfrDiagnosticRequest, InfrDiagnosticResult } from '../../../shared/infrDiagnosticTypes';
import { commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import { INFR_SCRIPT_PATHS, hubScriptRequirements, scriptGapsMessage, scriptKnowsFlag, type ScriptGap } from '../../../shared/infrScriptSupport';
import { isValidEnvName, isValidWinthorVersion } from '../../../shared/infrWinthorVersion';
import type { WslService } from '../WslService';
import type { InfrEnvCheckService } from './InfrEnvCheckService';

export type { InfrDiagnosticRequest, InfrDiagnosticResult };

const KEEP_REPORTS = 20;
const MAX_NOTES = 20000;

const iso = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');
const stamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/**
 * Relatório para suporte de um ambiente: junta o que o Hub já lê (containers, log da criação) com o que só ele consegue ver
 * (branch e alterações do INFR-Docker, se cada script conhece as opções que o Hub passa, arquivos de configuração
 * mascarados, Docker e disco) num texto para colar e num arquivo guardado. Só lê; nunca altera nada.
 */
export class InfrDiagnosticService {
  constructor(
    private readonly wsl: Pick<WslService, 'resolveInfrPaths'>,
    private readonly envCheck: Pick<InfrEnvCheckService, 'check'>,
    private readonly env: { hubVersion: () => string; dataDir: () => string }
  ) {}

  public async build(req: InfrDiagnosticRequest): Promise<InfrDiagnosticResult> {
    if (!isValidEnvName(req.name)) return { success: false, error: 'Nome de ambiente inválido (ex.: develop).' };
    const infr = this.wsl.resolveInfrPaths(req.infrPath);
    if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.' };
    const name = req.name.trim();
    const now = new Date();

    const check = await this.envCheck.check(req.distro, name);
    if (!check.distro) return { success: false, error: check.error || 'Não foi possível ler o ambiente.' };

    const logPath = buildLogPath(name) as string;
    const wtaImage = check.containers.find((c) => c.role === 'wta')?.image;
    const version = isValidWinthorVersion(req.version) ? req.version.trim() : parseWtaImage(wtaImage)?.version;
    let probe = new Map<string, string[]>();
    try {
      // O wsl.exe expande o `$` antes do bash: o roteiro vai em base64
      const b64 = Buffer.from(diagnosticProbeScript(name, logPath, this.dbUser(infr.windows, version))).toString('base64');
      const { stdout } = await execWsl(['-d', check.distro, '--', 'bash', '-c', `echo ${b64} | base64 -d | bash`], { timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
      probe = parseDiagnosticProbe(String(stdout));
    } catch (err: any) {
      probe.set('sistema', [`Não foi possível ler o Docker na distro ${check.distro}: ${commandFailureDetail(err)}`]);
    }

    const scripts = this.scripts(infr.windows);
    const gaps: ScriptGap[] = scripts
      .filter((s) => !s.exists || s.missing.length > 0)
      .map((s) => ({ script: s.script, path: s.path, ...(s.exists ? {} : { absent: true }), missing: s.missing }));

    const input: DiagnosticInput = {
      generatedAt: iso(now),
      hubVersion: this.env.hubVersion(),
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      name,
      distro: check.distro,
      infrPath: infr.windows,
      summary: check.summary,
      git: await this.git(infr.windows),
      scripts,
      gapsMessage: gaps.length ? scriptGapsMessage(gaps, infr.windows) : undefined,
      files: this.files(infr.windows, version),
      containers: check.containers.map((c) => ({ name: c.container, exists: c.exists, state: c.state, health: c.health, restarts: c.restarts, image: c.image, ports: c.ports })),
      probe,
      buildLog: check.buildLog?.exists ? { path: check.buildLog.path, failure: check.buildLog.failure, stage: check.buildLog.stage } : undefined,
      notes: req.notes?.slice(0, MAX_NOTES)
    };
    if (req.forAi) return { success: true, compact: buildCompactDiagnostic(input) };
    const text = buildDiagnosticReport(input);
    return { success: true, text, compact: buildCompactDiagnostic(input), path: this.save(name, text, now) };
  }

  /** Cada script que o Hub usa: existe, tamanho, data e as opções que ele não conhece. */
  private scripts(root: string): DiagnosticScript[] {
    return hubScriptRequirements().map((r) => {
      const rel = INFR_SCRIPT_PATHS[r.script];
      const file = path.join(root, rel);
      try {
        const stat = fs.statSync(file);
        const text = fs.readFileSync(file, 'utf-8');
        return { script: r.script, path: rel, exists: true, bytes: stat.size, modified: iso(stat.mtime), missing: r.flags.filter((f) => !scriptKnowsFlag(text, f)) };
      } catch {
        return { script: r.script, path: rel, exists: false, missing: [] };
      }
    });
  }

  /** DB_USER do wta.env da versão (só o nome do usuário; nada mais do arquivo é lido para o banco). */
  private dbUser(root: string, version?: string): string | undefined {
    const v = isValidWinthorVersion(version) ? version.trim() : undefined;
    if (!v) return undefined;
    try {
      return /^\s*(?:export\s+)?DB_USER\s*=\s*["']?([A-Za-z][A-Za-z0-9_]*)/m.exec(fs.readFileSync(path.join(root, 'linux-winthor', `wta.env.${v}`), 'utf-8'))?.[1];
    } catch {
      return undefined;
    }
  }

  /** Branch, commit e alterações locais; sem o git do Windows, a branch sai do .git/HEAD. */
  private async git(dir: string): Promise<DiagnosticInput['git']> {
    const run = async (args: string[]) => String((await execFileAsync('git', ['-C', dir, ...args], { timeout: 15000 })).stdout).trim();
    try {
      const [branch, commit, status] = await Promise.all([run(['rev-parse', '--abbrev-ref', 'HEAD']), run(['log', '-1', '--format=%h %ad %s', '--date=short']), run(['status', '--short'])]);
      return { branch, commit, changes: status.split(/\r?\n/).filter(Boolean) };
    } catch (err: any) {
      let branch: string | undefined;
      try {
        branch = /^ref:\s*refs\/heads\/(.+)$/m.exec(fs.readFileSync(path.join(dir, '.git', 'HEAD'), 'utf-8'))?.[1]?.trim();
      } catch {
        // pasta sem .git
      }
      return { branch, changes: [], error: `não deu para rodar o git (${commandFailureDetail(err)})` };
    }
  }

  /** wta.env.<v>, .env.<v> e versions/<v>.features: o que existe, de quando é e o conteúdo sem segredos. */
  private files(root: string, version?: string): DiagnosticFile[] {
    const stat = (file: string) => {
      try {
        return fs.statSync(file);
      } catch {
        return null;
      }
    };
    const list = (dir: string, match: RegExp) => {
      try {
        return fs.readdirSync(dir).filter((f) => match.test(f)).sort();
      } catch {
        return [];
      }
    };
    const wtaDir = path.join(root, 'linux-winthor');
    const wshDir = path.join(root, 'wsh-winthor');
    const out: DiagnosticFile[] = [
      { label: 'linux-winthor/wta.env.*', exists: list(wtaDir, /^wta\.env\.\d+$/).length > 0, note: list(wtaDir, /^wta\.env\.\d+$/).join(', ') || undefined },
      { label: 'wsh-winthor/.env.*', exists: list(wshDir, /^\.env\.\d+$/).length > 0, note: list(wshDir, /^\.env\.\d+$/).join(', ') || undefined },
      { label: 'linux-winthor/versions/*.features', exists: list(path.join(wtaDir, 'versions'), /\.features$/).length > 0, note: list(path.join(wtaDir, 'versions'), /\.features$/).join(', ') || undefined }
    ];
    if (!version) return out;
    const read = (label: string, file: string, mask: (t: string) => string): DiagnosticFile => {
      const s = stat(file);
      if (!s) return { label, exists: false };
      try {
        return { label, exists: true, modified: iso(s.mtime), lines: mask(fs.readFileSync(file, 'utf-8')).split(/\r?\n/).filter((l) => l.trim()).slice(0, 60) };
      } catch {
        return { label, exists: true, modified: iso(s.mtime), note: 'não foi possível ler' };
      }
    };
    out.push(read(`linux-winthor/wta.env.${version}`, path.join(wtaDir, `wta.env.${version}`), maskEnvText));
    out.push(read(`wsh-winthor/.env.${version}`, path.join(wshDir, `.env.${version}`), maskEnvText));
    const manifest = path.join(wtaDir, 'versions', `${version}.features`);
    const ms = stat(manifest);
    if (!ms) out.push({ label: `linux-winthor/versions/${version}.features`, exists: false });
    else {
      const text = fs.readFileSync(manifest, 'utf-8');
      const count = (kind: string) => text.split(/\r?\n/).filter((l) => new RegExp(`^${kind}\\s`).test(l.trim())).length;
      out.push({ label: `linux-winthor/versions/${version}.features`, exists: true, modified: iso(ms.mtime), note: `${count('repo')} repositórios e ${count('feature')} features` });
    }
    return out;
  }

  /** Guarda o relatório na pasta de dados do Hub e mantém só os mais recentes. */
  private save(name: string, text: string, now: Date): string | undefined {
    try {
      const dir = path.join(this.env.dataDir(), 'diagnosticos');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `infr-${name}-${stamp(now)}.md`);
      fs.writeFileSync(file, text, 'utf-8');
      const old = fs
        .readdirSync(dir)
        .filter((f) => /^infr-.+\.md$/.test(f))
        .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
        .slice(KEEP_REPORTS);
      for (const o of old) fs.rmSync(path.join(dir, o.f), { force: true });
      return file;
    } catch {
      return undefined;
    }
  }
}
