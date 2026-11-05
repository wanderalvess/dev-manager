// Evidências de desenvolvimento e de teste: contratos compartilhados entre main, preload e renderer, mais as
// regras puras (ids, chave do Jira, resumo). Quem toca disco, Jira ou tela é o EvidenceService.

export type EvidenceKind = 'dev' | 'qa';
export type EvidenceResult = 'pending' | 'passed' | 'failed';

export interface EvidenceStep {
  id: string;
  title: string;
  expected?: string;
  actual?: string;
  result: EvidenceResult;
  /** Nome do arquivo PNG dentro da pasta da sessão. */
  screenshot?: string;
  createdAt: string;
}

export interface EvidenceSession {
  /** `<tarefa>__AAAAMMDD-HHMMSS`; também é o caminho relativo da pasta (`tarefa/AAAAMMDD-HHMMSS`). */
  id: string;
  task: string;
  title: string;
  kind: EvidenceKind;
  tester?: string;
  /** Texto livre: versão da rotina, branch, ambiente de homologação etc. */
  environment?: string;
  steps: EvidenceStep[];
  /** Nomes dos vídeos .webm dentro da pasta da sessão. */
  videos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceSessionListItem {
  id: string;
  task: string;
  title: string;
  kind: EvidenceKind;
  createdAt: string;
  stepCount: number;
  failed: number;
  videoCount: number;
}

export interface EvidenceSessionInput {
  task: string;
  title?: string;
  kind: EvidenceKind;
  tester?: string;
  environment?: string;
}

export interface EvidenceCaptureSource {
  id: string;
  name: string;
  /** PNG em data URL, miniatura para o usuário escolher o que gravar. */
  thumbnail: string;
  isScreen: boolean;
}

export interface EvidenceReportFiles {
  html: string;
  pdf?: string;
}

export interface EvidenceJiraResult {
  success: boolean;
  error?: string;
  issueKey?: string;
  attached?: string[];
  skipped?: string[];
}

export interface EvidenceJiraIssue {
  success: boolean;
  error?: string;
  issueKey?: string;
  summary?: string;
  status?: string;
  assignee?: string;
}

export const EVIDENCE_HOTKEY = 'CommandOrControl+Shift+E';
export const EVIDENCE_HOTKEY_EVENT = 'evidence:hotkey-capture';
/** Vídeos maiores que isso ficam só no disco: o Jira costuma recusar anexos grandes. */
export const EVIDENCE_JIRA_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const SESSION_ID_RE = /^[A-Za-z0-9._-]{1,60}__\d{8}-\d{6}$/;
const FILE_NAME_RE = /^[A-Za-z0-9._-]{1,80}$/;
const JIRA_KEY_RE = /^[A-Z][A-Z0-9_]{1,20}-\d{1,9}$/;

/** Transforma "WT-123 / ajuste" em um nome de pasta seguro. */
export function slugifyTask(task: string): string {
  const slug = task
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60);
  return slug || 'sem-tarefa';
}

const pad = (n: number) => String(n).padStart(2, '0');

export function buildSessionId(task: string, now: Date): string {
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${slugifyTask(task)}__${stamp}`;
}

export const isValidSessionId = (id: unknown): id is string => typeof id === 'string' && SESSION_ID_RE.test(id);
export const isValidEvidenceFileName = (name: unknown): name is string => typeof name === 'string' && FILE_NAME_RE.test(name) && !name.includes('..');
export const normalizeJiraKey = (key: string): string | null => {
  const k = key.trim().toUpperCase();
  return JIRA_KEY_RE.test(k) ? k : null;
};

/** A chave do Jira embutida no nome da tarefa (ex.: "WT-123 ajuste"), para sugerir o destino da publicação. */
export function guessJiraKey(task: string): string {
  return /\b[A-Za-z][A-Za-z0-9_]{1,20}-\d{1,9}\b/.exec(task)?.[0].toUpperCase() ?? '';
}

export interface EvidenceSummary {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  verdict: EvidenceResult;
}

/** Reprovado se algum passo falhou; aprovado só quando todos passaram; senão, pendente. */
export function summarizeEvidence(steps: readonly EvidenceStep[]): EvidenceSummary {
  const passed = steps.filter((s) => s.result === 'passed').length;
  const failed = steps.filter((s) => s.result === 'failed').length;
  const pending = steps.length - passed - failed;
  const verdict: EvidenceResult = failed > 0 ? 'failed' : steps.length > 0 && pending === 0 ? 'passed' : 'pending';
  return { total: steps.length, passed, failed, pending, verdict };
}

export const RESULT_LABEL: Record<EvidenceResult, string> = { pending: 'Pendente', passed: 'Aprovado', failed: 'Reprovado' };
