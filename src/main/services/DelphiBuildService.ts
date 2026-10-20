import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigService } from './ConfigService';
import { WindowsService } from './WindowsService';
import { execFileAsync, isInsideDir, isSafeLocalPath } from '../utils/security';
import { launchProcessSafely } from '../utils/routineLaunchUtils';
import { runDelphiPipeline } from './delphiPipeline';
import {
  MAX_DIAGNOSTICS,
  buildBatchScript,
  delphiVersionLabel,
  parseDelphiBuildOutput,
  pickBuiltExe,
  tailLines,
  validateBuildRequest,
  type ExeCandidate
} from '../utils/delphiBuildUtils';
import type {
  DelphiBuildRequest,
  DelphiBuildResult,
  DelphiInstallation,
  DelphiPipelineRequest,
  DelphiPipelineResult,
  DelphiProject
} from '../../shared/types';

/** Raízes onde o RAD Studio grava `<versão>\bin\rsvars.bat` (64 e 32 bits do instalador). */
function studioRoots(): string[] {
  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles]
    .filter((p): p is string => Boolean(p))
    .map((base) => path.join(base, 'Embarcadero', 'Studio'));
  return roots;
}

// Pastas de saída/histórico não têm .dproj de interesse; na busca do .exe elas são justamente o alvo.
const PROJECT_SKIP_DIRS = new Set([
  'node_modules', '.git', '__history', '__recovery', 'win32', 'win64', 'debug', 'release', 'backup',
  'target', 'dist', 'bin', 'obj', '.vs', '.idea'
]);
const EXE_SKIP_DIRS = new Set(['node_modules', '.git', '__history']);
const MAX_PROJECTS = 300;

// Assíncrono para não travar o processo principal do Electron em árvores grandes (repositórios Maven/Karaf).
async function walkFiles(dir: string, depth: number, maxDepth: number, skip: Set<string>, visit: (file: string) => void): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < maxDepth && !skip.has(entry.name.toLowerCase())) await walkFiles(full, depth + 1, maxDepth, skip, visit);
    } else {
      visit(full);
    }
  }
}

/** Compila projetos Delphi via MSBuild (mesma cadeia da IDE) e devolve erros do compilador já estruturados. */
export class DelphiBuildService {
  private current: ChildProcess | null = null;
  private cancelled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly windowsService: WindowsService
  ) {}

  public detectInstallations(): DelphiInstallation[] {
    const found: DelphiInstallation[] = [];
    for (const root of studioRoots()) {
      let versions: string[] = [];
      try {
        versions = fs.readdirSync(root);
      } catch {
        continue;
      }
      for (const id of versions) {
        const rsvarsPath = path.join(root, id, 'bin', 'rsvars.bat');
        if (fs.existsSync(rsvarsPath)) found.push({ id, label: delphiVersionLabel(id), rsvarsPath });
      }
    }
    return found.sort((a, b) => parseFloat(b.id) - parseFloat(a.id));
  }

  /**
   * Varre atrás de arquivos .dproj. `root` só vale dentro da pasta de projetos das configurações:
   * fora dela (ou ausente) usa a própria pasta de projetos, para que a API não liste qualquer diretório do disco.
   */
  public async findProjects(root?: string): Promise<DelphiProject[]> {
    const projectsPath = (this.configService.getSettings().projectsPath || '').trim();
    const requested = (root || '').trim();
    const base = requested && projectsPath && isInsideDir(requested, projectsPath) ? requested : projectsPath;
    if (!base || !isSafeLocalPath(base) || !fs.existsSync(base)) return [];
    const projects: DelphiProject[] = [];
    await walkFiles(base, 0, 5, PROJECT_SKIP_DIRS, (file) => {
      if (projects.length >= MAX_PROJECTS || path.extname(file).toLowerCase() !== '.dproj') return;
      projects.push({
        name: path.basename(file, path.extname(file)),
        dprojPath: file,
        relativeDir: path.relative(base, path.dirname(file)) || '.'
      });
    });
    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  public isBuilding(): boolean {
    return this.current !== null;
  }

  public async cancel(): Promise<boolean> {
    const child = this.current;
    if (!child?.pid) return false;
    this.cancelled = true;
    // O MSBuild é neto do cmd.exe; sem /T o compilador seguiria rodando.
    await execFileAsync('taskkill.exe', ['/F', '/T', '/PID', String(child.pid)]).catch(() => undefined);
    return true;
  }

  public async build(req: DelphiBuildRequest, onLog: (chunk: string) => void): Promise<DelphiBuildResult> {
    const invalid = validateBuildRequest(req);
    if (invalid) throw new Error(invalid);
    if (!fs.existsSync(req.dprojPath)) throw new Error('Arquivo .dproj não encontrado.');
    if (!fs.existsSync(req.rsvarsPath)) throw new Error('rsvars.bat não encontrado.');
    if (this.current) throw new Error('Já existe um build Delphi em andamento.');

    const startedAt = Date.now();
    const scriptPath = path.join(os.tmpdir(), `hub-delphi-build-${startedAt}.cmd`);
    fs.writeFileSync(scriptPath, buildBatchScript(req), 'latin1');
    this.cancelled = false;

    let output = '';
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', scriptPath], {
        cwd: path.dirname(req.dprojPath),
        windowsHide: true
      });
      this.current = child;
      const forward = (data: Buffer) => {
        // O script força a página 1252 (chcp), que o latin1 decodifica fielmente para os caracteres do pt-BR.
        const text = data.toString('latin1');
        output += text;
        onLog(text);
      };
      child.stdout?.on('data', forward);
      child.stderr?.on('data', forward);
      child.on('error', reject);
      child.on('close', (code) => resolve(code));
    }).finally(() => {
      this.current = null;
      fs.rm(scriptPath, { force: true }, () => undefined);
    });

    const all = parseDelphiBuildOutput(output);
    const errorCount = all.filter((d) => d.severity === 'error').length;
    const warningCount = all.filter((d) => d.severity === 'warning').length;
    const success = exitCode === 0 && errorCount === 0 && !this.cancelled;
    const projectName = path.basename(req.dprojPath, path.extname(req.dprojPath));
    return {
      success,
      exitCode,
      cancelled: this.cancelled,
      durationMs: Date.now() - startedAt,
      errorCount,
      warningCount,
      diagnostics: all.slice(0, MAX_DIAGNOSTICS),
      logTail: success ? undefined : tailLines(output, 15),
      outputExePath: success ? await this.findBuiltExe(path.dirname(req.dprojPath), projectName, startedAt) : undefined
    };
  }

  public runPipeline(req: DelphiPipelineRequest, onLog: (chunk: string) => void): Promise<DelphiPipelineResult> {
    return runDelphiPipeline(req, {
      build: (buildReq) => this.build(buildReq, onLog),
      killImage: (imageName) => this.windowsService.killProcess(imageName),
      launch: (exePath, cwd) => launchProcessSafely(exePath, [], cwd),
      log: onLog
    });
  }

  private async findBuiltExe(projectDir: string, projectName: string, sinceMs: number): Promise<string | undefined> {
    const candidates: ExeCandidate[] = [];
    const visit = (file: string) => {
      if (path.extname(file).toLowerCase() !== '.exe') return;
      try {
        candidates.push({ path: file, mtimeMs: fs.statSync(file).mtimeMs });
      } catch {
        /* arquivo sumiu entre a listagem e o stat */
      }
    };
    await walkFiles(projectDir, 0, 3, EXE_SKIP_DIRS, visit);
    return pickBuiltExe(candidates, projectName, sinceMs - 2000);
  }
}
