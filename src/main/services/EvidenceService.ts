import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AppSettings } from '../../shared/types';
import {
  EVIDENCE_JIRA_MAX_VIDEO_BYTES,
  buildSessionId,
  isValidEvidenceFileName,
  isValidSessionId,
  normalizeJiraKey,
  type EvidenceJiraIssue,
  type EvidenceJiraResult,
  type EvidenceReportFiles,
  type EvidenceResult,
  type EvidenceSession,
  type EvidenceSessionInput,
  type EvidenceSessionListItem,
  type EvidenceStep
} from '../../shared/evidenceTypes';
import { describeJiraError, pickJiraSource } from '../../shared/jiraToday';
import { isSafeUrl } from '../utils/security';
import { buildEvidenceHtml, buildJiraComment } from './evidence/evidenceReport';

export interface EvidenceServiceDeps {
  rootDir: string;
  getSettings: () => AppSettings;
  fetchImpl: typeof fetch;
  /** Converte o HTML em PDF (BrowserWindow oculta no app real). */
  renderPdf: (htmlPath: string) => Promise<Buffer>;
  now?: () => Date;
}

const SESSION_FILE = 'session.json';
const REPORT_HTML = 'relatorio.html';
const REPORT_PDF = 'relatorio.pdf';
const RESULTS: readonly EvidenceResult[] = ['pending', 'passed', 'failed'];

const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().slice(0, max);
  return t || undefined;
};

/** Evidências em disco: uma pasta por sessão (`<raiz>/<tarefa>/<data-hora>`) com JSON, prints, vídeos e relatório. */
export class EvidenceService {
  constructor(private readonly deps: EvidenceServiceDeps) {}

  getRootDir(): string {
    return this.deps.rootDir;
  }

  private dirOf(id: string): string {
    if (!isValidSessionId(id)) throw new Error('Sessão inválida.');
    const [slug, stamp] = id.split('__');
    const dir = path.join(this.deps.rootDir, slug, stamp);
    const rel = path.relative(this.deps.rootDir, dir);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Sessão inválida.');
    return dir;
  }

  getSessionDir(id: string): string {
    return this.dirOf(id);
  }

  private write(session: EvidenceSession): EvidenceSession {
    session.updatedAt = (this.deps.now?.() ?? new Date()).toISOString();
    fs.writeFileSync(path.join(this.dirOf(session.id), SESSION_FILE), JSON.stringify(session, null, 2), 'utf-8');
    return session;
  }

  createSession(input: EvidenceSessionInput): EvidenceSession {
    const task = text(input.task, 120);
    if (!task) throw new Error('Informe a tarefa (ex.: WT-123).');
    const now = this.deps.now?.() ?? new Date();
    const id = buildSessionId(task, now);
    fs.mkdirSync(this.dirOf(id), { recursive: true });
    const iso = now.toISOString();
    return this.write({
      id,
      task,
      title: text(input.title, 200) ?? task,
      kind: input.kind === 'qa' ? 'qa' : 'dev',
      tester: text(input.tester, 80),
      environment: text(input.environment, 500),
      steps: [],
      videos: [],
      createdAt: iso,
      updatedAt: iso
    });
  }

  get(id: string): EvidenceSession {
    const file = path.join(this.dirOf(id), SESSION_FILE);
    if (!fs.existsSync(file)) throw new Error('Sessão não encontrada.');
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as EvidenceSession;
  }

  list(): EvidenceSessionListItem[] {
    const root = this.deps.rootDir;
    if (!fs.existsSync(root)) return [];
    const items: EvidenceSessionListItem[] = [];
    for (const taskDir of fs.readdirSync(root, { withFileTypes: true })) {
      if (!taskDir.isDirectory()) continue;
      for (const sessionDir of fs.readdirSync(path.join(root, taskDir.name), { withFileTypes: true })) {
        if (!sessionDir.isDirectory()) continue;
        try {
          const s = this.get(`${taskDir.name}__${sessionDir.name}`);
          items.push({
            id: s.id,
            task: s.task,
            title: s.title,
            kind: s.kind,
            createdAt: s.createdAt,
            stepCount: s.steps.length,
            failed: s.steps.filter((x) => x.result === 'failed').length,
            videoCount: s.videos.length
          });
        } catch {
          // pasta que não é uma sessão: ignora
        }
      }
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  addStep(id: string, png: Buffer | null, title?: string): EvidenceSession {
    const session = this.get(id);
    const n = session.steps.length + 1;
    let screenshot: string | undefined;
    if (png && png.length > 0) {
      screenshot = `passo-${String(n).padStart(2, '0')}-${crypto.randomBytes(2).toString('hex')}.png`;
      fs.writeFileSync(path.join(this.dirOf(id), screenshot), png);
    }
    const step: EvidenceStep = {
      id: crypto.randomUUID(),
      title: text(title, 200) ?? `Passo ${n}`,
      result: 'pending',
      screenshot,
      createdAt: (this.deps.now?.() ?? new Date()).toISOString()
    };
    session.steps.push(step);
    return this.write(session);
  }

  updateStep(id: string, stepId: string, patch: Partial<Pick<EvidenceStep, 'title' | 'expected' | 'actual' | 'result'>>): EvidenceSession {
    const session = this.get(id);
    const step = session.steps.find((s) => s.id === stepId);
    if (!step) throw new Error('Passo não encontrado.');
    if (patch.title !== undefined) step.title = text(patch.title, 200) ?? step.title;
    if (patch.expected !== undefined) step.expected = text(patch.expected, 2000);
    if (patch.actual !== undefined) step.actual = text(patch.actual, 2000);
    if (patch.result !== undefined && RESULTS.includes(patch.result)) step.result = patch.result;
    return this.write(session);
  }

  deleteStep(id: string, stepId: string): EvidenceSession {
    const session = this.get(id);
    const step = session.steps.find((s) => s.id === stepId);
    if (!step) return session;
    session.steps = session.steps.filter((s) => s.id !== stepId);
    if (step.screenshot && isValidEvidenceFileName(step.screenshot)) {
      fs.rmSync(path.join(this.dirOf(id), step.screenshot), { force: true });
    }
    return this.write(session);
  }

  saveVideo(id: string, data: Buffer): EvidenceSession {
    if (!data.length) throw new Error('Gravação vazia.');
    const session = this.get(id);
    const name = `video-${String(session.videos.length + 1).padStart(2, '0')}.webm`;
    fs.writeFileSync(path.join(this.dirOf(id), name), data);
    session.videos.push(name);
    return this.write(session);
  }

  deleteSession(id: string): void {
    const dir = this.dirOf(id);
    fs.rmSync(dir, { recursive: true, force: true });
    const parent = path.dirname(dir);
    if (fs.existsSync(parent) && fs.readdirSync(parent).length === 0) fs.rmdirSync(parent);
  }

  getImageDataUrl(id: string, name: string): string | null {
    if (!isValidEvidenceFileName(name)) return null;
    const file = path.join(this.dirOf(id), name);
    return fs.existsSync(file) ? `data:image/png;base64,${fs.readFileSync(file).toString('base64')}` : null;
  }

  replaceImage(id: string, name: string, png: Buffer): boolean {
    if (!isValidEvidenceFileName(name) || !name.toLowerCase().endsWith('.png')) return false;
    const file = path.join(this.dirOf(id), name);
    if (!fs.existsSync(file)) return false;
    fs.writeFileSync(file, png);
    return true;
  }

  private embedImages(session: EvidenceSession): Map<string, string> {
    const images = new Map<string, string>();
    for (const step of session.steps) {
      if (!step.screenshot || !isValidEvidenceFileName(step.screenshot)) continue;
      const file = path.join(this.dirOf(session.id), step.screenshot);
      if (fs.existsSync(file)) images.set(step.screenshot, `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`);
    }
    return images;
  }

  async generateReport(id: string, withPdf: boolean): Promise<EvidenceReportFiles> {
    const session = this.get(id);
    const dir = this.dirOf(id);
    const html = path.join(dir, REPORT_HTML);
    fs.writeFileSync(html, buildEvidenceHtml(session, this.embedImages(session)), 'utf-8');
    if (!withPdf) return { html };
    const pdf = path.join(dir, REPORT_PDF);
    fs.writeFileSync(pdf, await this.deps.renderPdf(html));
    return { html, pdf };
  }

  async publishToJira(id: string, rawKey: string, opts: { includeVideos: boolean }): Promise<EvidenceJiraResult> {
    const issueKey = normalizeJiraKey(rawKey);
    if (!issueKey) return { success: false, error: 'Chave do Jira inválida (ex.: WT-123).' };
    const source = pickJiraSource(this.deps.getSettings().jiraSources);
    if (!source) return { success: false, error: 'Cadastre um Jira com token em Documentação › Confluence & Jira.' };
    const baseUrl = source.baseUrl.trim().replace(/\/+$/, '');
    if (!isSafeUrl(baseUrl)) return { success: false, error: 'URL do Jira inválida.' };

    try {
      const session = this.get(id);
      const dir = this.dirOf(id);
      const report = await this.generateReport(id, true);
      const files = [report.pdf ?? report.html];
      const skipped: string[] = [];
      if (opts.includeVideos) {
        for (const video of session.videos) {
          const file = path.join(dir, video);
          if (!fs.existsSync(file)) continue;
          if (fs.statSync(file).size > EVIDENCE_JIRA_MAX_VIDEO_BYTES) skipped.push(video);
          else files.push(file);
        }
      }

      const headers = { Authorization: `Bearer ${source.authToken}`, 'X-Atlassian-Token': 'no-check' };
      const attached: string[] = [];
      for (const file of files) {
        const form = new FormData();
        const name = path.basename(file);
        form.append('file', new Blob([new Uint8Array(fs.readFileSync(file))]), name);
        const res = await this.deps.fetchImpl(`${baseUrl}/rest/api/2/issue/${issueKey}/attachments`, { method: 'POST', headers, body: form });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        attached.push(name);
      }

      const res = await this.deps.fetchImpl(`${baseUrl}/rest/api/2/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: { Authorization: headers.Authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: buildJiraComment(session, attached) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { success: true, issueKey, attached, skipped };
    } catch (err) {
      return { success: false, error: describeJiraError(err) };
    }
  }
  async lookupIssue(rawKey: string): Promise<EvidenceJiraIssue> {
    const issueKey = normalizeJiraKey(rawKey);
    if (!issueKey) return { success: false, error: 'Chave do Jira inválida (ex.: WT-123).' };
    const source = pickJiraSource(this.deps.getSettings().jiraSources);
    if (!source) return { success: false, error: 'Cadastre um Jira com token em Documentação › Confluence & Jira.' };
    const baseUrl = source.baseUrl.trim().replace(/\/+$/, '');
    if (!isSafeUrl(baseUrl)) return { success: false, error: 'URL do Jira inválida.' };
    try {
      const res = await this.deps.fetchImpl(`${baseUrl}/rest/api/2/issue/${issueKey}?fields=summary,status,assignee`, {
        headers: { Authorization: `Bearer ${source.authToken}`, Accept: 'application/json' }
      });
      if (res.status === 404) return { success: false, error: `Issue ${issueKey} não encontrada.` };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { fields?: { summary?: string; status?: { name?: string }; assignee?: { displayName?: string } } };
      return {
        success: true,
        issueKey,
        summary: data.fields?.summary,
        status: data.fields?.status?.name,
        assignee: data.fields?.assignee?.displayName
      };
    } catch (err) {
      return { success: false, error: describeJiraError(err) };
    }
  }
}
