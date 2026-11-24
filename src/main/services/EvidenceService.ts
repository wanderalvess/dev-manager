import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AppSettings } from '../../shared/types';
import {
  EVIDENCE_BLOCK_KINDS,
  EVIDENCE_BLOCK_MAX_CHARS,
  EVIDENCE_JIRA_MAX_VIDEO_BYTES,
  EVIDENCE_PHASES,
  EVIDENCE_REPORT_FILE,
  buildSessionId,
  evaluateChecks,
  isValidEvidenceFileName,
  isValidSessionId,
  normalizeJiraKey,
  sanitizeActions,
  sanitizeLinks,
  type EvidenceAction,
  type EvidenceMarker,
  type EvidenceBlock,
  type EvidenceBlockInput,
  type EvidenceJiraIssue,
  type EvidenceLink,
  type EvidenceJiraPreview,
  type EvidenceJiraPreviewAttachment,
  type EvidenceJiraResult,
  type EvidenceReportFiles,
  type EvidenceReportLayout,
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
const RESULTS: readonly EvidenceResult[] = ['pending', 'passed', 'failed'];

/** Mensagem do próprio Jira (errorMessages/errors) para dizer o motivo de um HTTP de erro; nunca vem o token. */
async function jiraDetail(res: { text?: () => Promise<string> }): Promise<string> {
  try {
    const body = JSON.parse((await res.text?.()) ?? '') as { errorMessages?: string[]; errors?: Record<string, string>; message?: string };
    const first = body.errorMessages?.[0] ?? Object.values(body.errors ?? {})[0] ?? body.message ?? '';
    return String(first).replace(/\s+/g, ' ').trim().slice(0, 160);
  } catch {
    return '';
  }
}

/** Falha de uma etapa da publicação: o texto diz qual foi (anexo ou comentário) e o que costuma causar. */
class JiraStepError extends Error {
  constructor(
    readonly step: 'attach' | 'comment',
    readonly status: number,
    readonly detail: string,
    readonly file?: string
  ) {
    super(`HTTP ${status}`);
  }

  describe(alreadyAttached: readonly string[]): string {
    const why = this.detail ? ` Resposta do Jira: "${this.detail}".` : '';
    if (this.status === 401) return 'O Jira recusou o token (HTTP 401). Confira o token em Documentação › Confluence & Jira.';
    if (this.step === 'attach') {
      const cause = this.status === 403 || this.status === 404 ? ' Costuma ser anexo desativado no Jira ou falta da permissão "Criar anexos" nessa tarefa.' : '';
      const state = alreadyAttached.length ? ` Já foram enviados: ${alreadyAttached.join(', ')}.` : ' Nada foi publicado ainda; dá para publicar só o comentário.';
      return `O Jira não aceitou o anexo${this.file ? ` ${this.file}` : ''} (HTTP ${this.status}).${cause}${why}${state}`;
    }
    const cause = this.status === 403 || this.status === 404 ? ' Costuma ser falta da permissão "Adicionar comentários" nessa tarefa.' : '';
    const sent = alreadyAttached.length ? ` Os anexos já foram enviados (${alreadyAttached.join(', ')}): ao tentar de novo, vão duplicar.` : '';
    return `O Jira não aceitou o comentário (HTTP ${this.status}).${cause}${why}${sent}`;
  }
}

const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().slice(0, max);
  return t || undefined;
};

const validMarker = (m: EvidenceMarker | undefined): EvidenceMarker | undefined =>
  m && Number.isFinite(m.x) && Number.isFinite(m.y) && m.x >= 0 && m.x <= 1 && m.y >= 0 && m.y <= 1 ? { x: m.x, y: m.y } : undefined;

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

  private linksField(raw: unknown): { links?: EvidenceLink[] } {
    const links = sanitizeLinks(raw, () => crypto.randomUUID());
    return links.length ? { links } : {};
  }

  createSession(input: EvidenceSessionInput): EvidenceSession {
    // A tarefa é opcional: só a publicação no Jira exige uma chave. Sem ela a pasta vira "sem-tarefa/AAAAMMDD-HHMMSS".
    const task = text(input.task, 120) ?? '';
    let now = this.deps.now?.() ?? new Date();
    let id = buildSessionId(task, now);
    // Duas sessões da mesma tarefa no mesmo segundo (ex.: reexecução) não podem dividir a pasta.
    while (fs.existsSync(this.dirOf(id))) {
      now = new Date(now.getTime() + 1000);
      id = buildSessionId(task, now);
    }
    fs.mkdirSync(this.dirOf(id), { recursive: true });
    const iso = now.toISOString();
    return this.write({
      id,
      task,
      title: text(input.title, 200) ?? (task || `Evidência de ${now.toLocaleString('pt-BR')}`),
      kind: input.kind === 'qa' ? 'qa' : 'dev',
      tester: text(input.tester, 80),
      environment: text(input.environment, 500),
      ...this.linksField(input.links),
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

  addStep(id: string, png: Buffer | null, title?: string, extra?: { actions?: EvidenceAction[]; marker?: EvidenceMarker; expected?: string }): EvidenceSession {
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
      expected: text(extra?.expected, 2000),
      actions: extra?.actions?.length ? sanitizeActions(extra.actions, () => crypto.randomUUID()) : undefined,
      marker: validMarker(extra?.marker),
      createdAt: (this.deps.now?.() ?? new Date()).toISOString()
    };
    session.steps.push(step);
    return this.write(session);
  }

  setActions(id: string, stepId: string, actions: unknown): EvidenceSession {
    const session = this.get(id);
    const step = this.findStep(session, stepId);
    const clean = sanitizeActions(actions, () => crypto.randomUUID());
    step.actions = clean.length ? clean : undefined;
    return this.write(session);
  }

  /** Nova sessão pronta para uma reexecução: mesma tarefa e ambiente, sem passos. */
  createReplaySession(id: string): EvidenceSession {
    const source = this.get(id);
    return this.createSession({
      task: source.task,
      title: `${source.title} (reexecução)`,
      kind: source.kind,
      tester: source.tester,
      environment: source.environment,
      links: source.links
    });
  }

  /**
   * Edita os dados informados ao iniciar a evidência. A pasta não muda (o id guarda a tarefa e a data de
   * criação), então corrigir a tarefa aqui não quebra os caminhos já gravados.
   */
  updateSession(id: string, patch: Partial<EvidenceSessionInput>): EvidenceSession {
    const session = this.get(id);
    if (patch.task !== undefined) session.task = text(patch.task, 120) ?? '';
    if (patch.title !== undefined) session.title = text(patch.title, 200) ?? (session.task || 'Evidência sem título');
    if (patch.kind !== undefined && (patch.kind === 'qa' || patch.kind === 'dev')) session.kind = patch.kind;
    if (patch.tester !== undefined) session.tester = text(patch.tester, 80);
    if (patch.environment !== undefined) session.environment = text(patch.environment, 500);
    if (patch.links !== undefined) {
      const links = sanitizeLinks(patch.links, () => crypto.randomUUID());
      if (links.length) session.links = links;
      else delete session.links;
    }
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

  private findStep(session: EvidenceSession, stepId: string): EvidenceStep {
    const step = session.steps.find((s) => s.id === stepId);
    if (!step) throw new Error('Passo não encontrado.');
    return step;
  }

  addBlock(id: string, stepId: string, input: EvidenceBlockInput): EvidenceSession {
    if (!EVIDENCE_BLOCK_KINDS.includes(input.kind)) throw new Error('Tipo de prova inválido.');
    const session = this.get(id);
    const step = this.findStep(session, stepId);
    const block: EvidenceBlock = {
      id: crypto.randomUUID(),
      kind: input.kind,
      phase: EVIDENCE_PHASES.includes(input.phase) ? input.phase : 'single',
      title: text(input.title, 200),
      request: text(input.request, EVIDENCE_BLOCK_MAX_CHARS),
      response: text(input.response, EVIDENCE_BLOCK_MAX_CHARS),
      meta: text(input.meta, 300),
      checks: text(input.checks, 2000),
      environment: text(input.environment, 100),
      createdAt: (this.deps.now?.() ?? new Date()).toISOString()
    };
    block.verdict = evaluateChecks(block.checks, block);
    step.blocks = [...(step.blocks ?? []), block];
    this.applyVerdicts(step);
    return this.write(session);
  }

  /** O resultado do passo acompanha as regras das provas "Depois"/"Evidência": qualquer reprovação reprova; tudo aprovado aprova. */
  private applyVerdicts(step: EvidenceStep): void {
    const verdicts = (step.blocks ?? []).filter((b) => b.phase !== 'before' && b.verdict).map((b) => b.verdict!);
    if (verdicts.length === 0) return;
    if (verdicts.some((v) => !v.passed)) step.result = 'failed';
    else if (step.result !== 'passed') step.result = 'passed';
  }

  updateBlock(id: string, stepId: string, blockId: string, patch: Partial<EvidenceBlockInput>): EvidenceSession {
    const session = this.get(id);
    const block = this.findStep(session, stepId).blocks?.find((b) => b.id === blockId);
    if (!block) throw new Error('Prova não encontrada.');
    if (patch.phase !== undefined && EVIDENCE_PHASES.includes(patch.phase)) block.phase = patch.phase;
    if (patch.title !== undefined) block.title = text(patch.title, 200);
    if (patch.request !== undefined) block.request = text(patch.request, EVIDENCE_BLOCK_MAX_CHARS);
    if (patch.response !== undefined) block.response = text(patch.response, EVIDENCE_BLOCK_MAX_CHARS);
    if (patch.meta !== undefined) block.meta = text(patch.meta, 300);
    if (patch.checks !== undefined) block.checks = text(patch.checks, 2000);
    if (patch.environment !== undefined) block.environment = text(patch.environment, 100);
    block.verdict = evaluateChecks(block.checks, block);
    this.applyVerdicts(this.findStep(session, stepId));
    return this.write(session);
  }

  deleteBlock(id: string, stepId: string, blockId: string): EvidenceSession {
    const session = this.get(id);
    const step = this.findStep(session, stepId);
    step.blocks = (step.blocks ?? []).filter((b) => b.id !== blockId);
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

  async generateReport(id: string, withPdf: boolean, layout: EvidenceReportLayout = 'document'): Promise<EvidenceReportFiles> {
    const session = this.get(id);
    const dir = this.dirOf(id);
    const base = EVIDENCE_REPORT_FILE[layout] ?? EVIDENCE_REPORT_FILE.document;
    const html = path.join(dir, `${base}.html`);
    fs.writeFileSync(html, buildEvidenceHtml(session, this.embedImages(session), layout === 'slides' ? 'slides' : 'document'), 'utf-8');
    if (!withPdf) return { html };
    const pdf = path.join(dir, `${base}.pdf`);
    fs.writeFileSync(pdf, await this.deps.renderPdf(html));
    return { html, pdf };
  }

  /** Mostra o que a publicação enviaria (comentário e anexos) sem gerar o PDF nem falar com o Jira. */
  previewJiraPublication(id: string, includeVideos: boolean, attachFiles = true): EvidenceJiraPreview {
    const session = this.get(id);
    const dir = this.dirOf(id);
    const attachments: EvidenceJiraPreviewAttachment[] = attachFiles ? [{ name: `${EVIDENCE_REPORT_FILE.document}.pdf`, kind: 'report' }] : [];
    if (attachFiles && includeVideos) {
      for (const video of session.videos) {
        const file = path.join(dir, video);
        if (!fs.existsSync(file)) continue;
        const sizeBytes = fs.statSync(file).size;
        attachments.push({ name: video, kind: 'video', sizeBytes, skipped: sizeBytes > EVIDENCE_JIRA_MAX_VIDEO_BYTES });
      }
    }
    const comment = buildJiraComment(session, attachments.filter((a) => !a.skipped).map((a) => a.name));
    return { comment, attachments };
  }

  async publishToJira(id: string, rawKey: string, opts: { includeVideos: boolean; attachFiles?: boolean }): Promise<EvidenceJiraResult> {
    const issueKey = normalizeJiraKey(rawKey);
    if (!issueKey) return { success: false, error: 'Chave do Jira inválida (ex.: WT-123).' };
    const source = pickJiraSource(this.deps.getSettings().jiraSources);
    if (!source) return { success: false, error: 'Cadastre um Jira com token em Documentação › Confluence & Jira.' };
    const baseUrl = source.baseUrl.trim().replace(/\/+$/, '');
    if (!isSafeUrl(baseUrl)) return { success: false, error: 'URL do Jira inválida.' };

    const attached: string[] = [];
    try {
      const session = this.get(id);
      const dir = this.dirOf(id);
      const attachFiles = opts.attachFiles !== false;
      const report = attachFiles ? await this.generateReport(id, true) : null;
      const files = report ? [report.pdf ?? report.html] : [];
      const skipped: string[] = [];
      if (attachFiles && opts.includeVideos) {
        for (const video of session.videos) {
          const file = path.join(dir, video);
          if (!fs.existsSync(file)) continue;
          if (fs.statSync(file).size > EVIDENCE_JIRA_MAX_VIDEO_BYTES) skipped.push(video);
          else files.push(file);
        }
      }

      const headers = { Authorization: `Bearer ${source.authToken}`, 'X-Atlassian-Token': 'no-check' };
      for (const file of files) {
        const form = new FormData();
        const name = path.basename(file);
        form.append('file', new Blob([new Uint8Array(fs.readFileSync(file))]), name);
        const res = await this.deps.fetchImpl(`${baseUrl}/rest/api/2/issue/${issueKey}/attachments`, { method: 'POST', headers, body: form });
        if (!res.ok) throw new JiraStepError('attach', res.status, await jiraDetail(res), name);
        attached.push(name);
      }

      const res = await this.deps.fetchImpl(`${baseUrl}/rest/api/2/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: { Authorization: headers.Authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: buildJiraComment(session, attached) })
      });
      if (!res.ok) throw new JiraStepError('comment', res.status, await jiraDetail(res));
      return { success: true, issueKey, attached, skipped };
    } catch (err) {
      if (err instanceof JiraStepError) return { success: false, error: err.describe(attached), failedStep: err.step, attached };
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
