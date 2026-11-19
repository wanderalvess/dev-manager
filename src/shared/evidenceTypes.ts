// Evidências de desenvolvimento e de teste: contratos compartilhados entre main, preload e renderer, mais as
// regras puras (ids, chave do Jira, resumo). Quem toca disco, Jira ou tela é o EvidenceService.

export type EvidenceKind = 'dev' | 'qa';
export type EvidenceResult = 'pending' | 'passed' | 'failed';

/** Prova em texto anexada a um passo: chamada de API (Postman), consulta SQL ou anotação livre. */
export type EvidenceBlockKind = 'api' | 'sql' | 'text';
/** "antes" e "depois" aparecem lado a lado no relatório; "single" ocupa a largura toda. */
export type EvidencePhase = 'before' | 'after' | 'single';

export interface EvidenceBlock {
  id: string;
  kind: EvidenceBlockKind;
  phase: EvidencePhase;
  title?: string;
  /** api: método, URL, cabeçalhos e corpo; sql: a consulta. */
  request?: string;
  /** api: corpo da resposta; sql: resultado em tabela; text: o conteúdo. */
  response?: string;
  /** Linha de resumo: "200 OK · 123 ms" ou "12 linhas · 45 ms · conexão". */
  meta?: string;
  createdAt: string;
}

/** Ação de entrada reproduzível: o roteiro de um passo. Não há captura de teclado: digitação só existe se o usuário escrever. */
export type EvidenceActionType = 'click' | 'type' | 'key' | 'wait';
export interface EvidenceAction {
  id: string;
  type: EvidenceActionType;
  /** click: posição em pixels físicos da tela principal. */
  x?: number;
  y?: number;
  button?: 'left' | 'right';
  /** type: texto digitado. */
  text?: string;
  /** key: nome da tecla (chave de EVIDENCE_KEYS). */
  key?: string;
  /** wait: espera em ms. */
  ms?: number;
}

/** Teclas permitidas no roteiro e o código equivalente do SendKeys. */
export const EVIDENCE_KEYS: Record<string, string> = {
  Enter: '{ENTER}',
  Tab: '{TAB}',
  Esc: '{ESC}',
  Backspace: '{BACKSPACE}',
  Delete: '{DELETE}',
  'Seta ↑': '{UP}',
  'Seta ↓': '{DOWN}',
  'Seta ←': '{LEFT}',
  'Seta →': '{RIGHT}',
  Home: '{HOME}',
  End: '{END}',
  'Page Up': '{PGUP}',
  'Page Down': '{PGDN}',
  F5: '{F5}'
};
export const EVIDENCE_MAX_ACTIONS = 50;
export const EVIDENCE_REPLAY_ABORT_HOTKEY = 'CommandOrControl+Shift+Q';
export const EVIDENCE_AUTO_EVENT = 'evidence:auto-step';
export const EVIDENCE_REPLAY_EVENT = 'evidence:replay-progress';
export interface EvidenceReplayProgress {
  sessionId: string;
  done: number;
  total: number;
  finished?: boolean;
  error?: string;
}

/** Posição do clique na imagem, de 0 a 1, para desenhar o marcador no relatório. */
export interface EvidenceMarker {
  x: number;
  y: number;
}

const clampInt = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined;

/** Valida o que veio do renderer: descarta ação malformada e limita tamanhos. */
export function sanitizeActions(raw: unknown, makeId: () => string): EvidenceAction[] {
  if (!Array.isArray(raw)) return [];
  const out: EvidenceAction[] = [];
  for (const item of raw.slice(0, EVIDENCE_MAX_ACTIONS)) {
    const a = (item ?? {}) as Partial<EvidenceAction>;
    const id = typeof a.id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(a.id) ? a.id : makeId();
    if (a.type === 'click') {
      const x = clampInt(a.x, 0, 20000);
      const y = clampInt(a.y, 0, 20000);
      if (x !== undefined && y !== undefined) out.push({ id, type: 'click', x, y, button: a.button === 'right' ? 'right' : 'left' });
    } else if (a.type === 'type' && typeof a.text === 'string' && a.text) {
      out.push({ id, type: 'type', text: a.text.slice(0, 500) });
    } else if (a.type === 'key' && typeof a.key === 'string' && a.key in EVIDENCE_KEYS) {
      out.push({ id, type: 'key', key: a.key });
    } else if (a.type === 'wait') {
      out.push({ id, type: 'wait', ms: clampInt(a.ms, 0, 30000) ?? 1000 });
    }
  }
  return out;
}

/** Escapa o texto para o SendKeys (caracteres especiais entre chaves; quebra de linha vira Enter). */
export const escapeSendKeys = (text: string): string =>
  text.replace(/\r?\n|[+^%~(){}[\]]/g, (m) => (/^\s/.test(m) ? '{ENTER}' : `{${m}}`));

export function describeAction(a: EvidenceAction): string {
  switch (a.type) {
    case 'click':
      return `${a.button === 'right' ? 'Clique direito' : 'Clique'} em (${a.x}, ${a.y})`;
    case 'type':
      return `Digitar "${(a.text ?? '').length > 30 ? `${(a.text ?? '').slice(0, 30)}…` : a.text}"`;
    case 'key':
      return `Tecla ${a.key}`;
    default:
      return `Esperar ${a.ms} ms`;
  }
}

export type EvidenceBlockInput =Pick<EvidenceBlock, 'kind' | 'phase' | 'title' | 'request' | 'response' | 'meta'>;

export interface EvidenceStep {
  id: string;
  title: string;
  expected?: string;
  actual?: string;
  result: EvidenceResult;
  /** Nome do arquivo PNG dentro da pasta da sessão. */
  screenshot?: string;
  /** Provas em texto (API, SQL, anotações), na ordem em que foram registradas. */
  blocks?: EvidenceBlock[];
  /** Roteiro que leva a este passo (cliques gravados + o que o usuário acrescentou). */
  actions?: EvidenceAction[];
  /** Onde foi o clique que gerou o print. */
  marker?: EvidenceMarker;
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

/** "document": relatório corrido (A4 retrato). "slides": uma página paisagem por passo, para apresentar. */
export type EvidenceReportLayout = 'document' | 'slides';
export const EVIDENCE_REPORT_FILE: Record<EvidenceReportLayout, string> = { document: 'relatorio', slides: 'apresentacao' };

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
export const BLOCK_KIND_LABEL: Record<EvidenceBlockKind, string> = { api: 'API', sql: 'SQL', text: 'Anotação' };
export const PHASE_LABEL: Record<EvidencePhase, string> = { before: 'Antes', after: 'Depois', single: 'Evidência' };

export const EVIDENCE_BLOCK_KINDS: readonly EvidenceBlockKind[] = ['api', 'sql', 'text'];
export const EVIDENCE_PHASES: readonly EvidencePhase[] = ['before', 'after', 'single'];
export const EVIDENCE_BLOCK_MAX_CHARS = 60_000;
const SQL_RESULT_MAX_ROWS = 200;
const SQL_CELL_MAX_CHARS = 80;

/** Só consultas de leitura rodam direto da evidência: a prova não pode alterar o banco. */
export function isReadOnlySql(sql: string): boolean {
  const clean = sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim()
    .replace(/;+\s*$/, '');
  if (!/^(select|with)\b/i.test(clean) || clean.includes(';')) return false;
  return !/\b(insert|update|delete|merge|drop|alter|truncate|create|grant|revoke|execute|exec|call)\b/i.test(clean.replace(/'(?:[^']|'')*'/g, "''"));
}

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  const raw = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const flat = raw.replace(/\s+/g, ' ');
  return flat.length > SQL_CELL_MAX_CHARS ? `${flat.slice(0, SQL_CELL_MAX_CHARS - 1)}…` : flat;
};

/** Resultado de consulta em tabela de texto alinhada (cabe em <pre> e em comentário do Jira). */
export function formatQueryTable(columns: readonly string[], rows: readonly Record<string, unknown>[], truncated = false): string {
  if (columns.length === 0) return '(sem colunas)';
  if (rows.length === 0) return '(nenhuma linha)';
  const shown = rows.slice(0, SQL_RESULT_MAX_ROWS);
  const cells = shown.map((row) => columns.map((c) => cellText(row[c])));
  const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)));
  const line = (parts: readonly string[]) => parts.map((p, i) => p.padEnd(widths[i])).join(' | ').trimEnd();
  const out = [line(columns), widths.map((w) => '-'.repeat(w)).join('-+-'), ...cells.map(line)];
  if (truncated || rows.length > shown.length) out.push(`… resultado limitado a ${shown.length} linhas`);
  return out.join('\n');
}

export interface EvidenceHttpExchange {
  method: string;
  url: string;
  headers?: string;
  body?: string;
  status?: number;
  statusText?: string;
  durationMs?: number;
  sizeBytes?: number;
  responseBody?: string;
  error?: string;
}

const prettyJson = (text: string | undefined): string => {
  if (!text) return '';
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

const formatBytes = (n: number): string => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

/** Monta os campos de um bloco "api" a partir de uma chamada HTTP já executada. */
export function formatHttpExchange(x: EvidenceHttpExchange): Pick<EvidenceBlock, 'request' | 'response' | 'meta'> {
  const request = [`${x.method} ${x.url}`, x.headers?.trim(), x.body?.trim() ? `\n${prettyJson(x.body.trim())}` : '']
    .filter((part) => part !== undefined && part !== '')
    .join('\n');
  if (x.error) return { request, response: x.error, meta: 'Falha na requisição' };
  const meta = [
    x.status !== undefined ? `${x.status}${x.statusText ? ` ${x.statusText}` : ''}` : '',
    x.durationMs !== undefined ? `${x.durationMs} ms` : '',
    x.sizeBytes !== undefined ? formatBytes(x.sizeBytes) : ''
  ]
    .filter(Boolean)
    .join(' · ');
  return { request, response: prettyJson(x.responseBody), meta };
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
export type EvidenceHttpMethod = (typeof HTTP_METHODS)[number];
export const EVIDENCE_HTTP_METHODS: readonly EvidenceHttpMethod[] = HTTP_METHODS;

/** Faz o caminho inverso de formatHttpExchange: recupera método, URL, cabeçalhos e corpo do texto da requisição. */
export function parseHttpRequestText(request: string | undefined): { method: EvidenceHttpMethod; url: string; headers: string; body: string } | null {
  const lines = (request ?? '').replace(/\r\n/g, '\n').split('\n');
  const first = /^([A-Za-z]+)\s+(\S.*)$/.exec(lines[0] ?? '');
  const method = first?.[1].toUpperCase() as EvidenceHttpMethod | undefined;
  if (!first || !method || !HTTP_METHODS.includes(method)) return null;
  const rest = lines.slice(1);
  const gap = rest.indexOf('');
  const headers = (gap === -1 ? rest : rest.slice(0, gap)).join('\n').trim();
  const body = gap === -1 ? '' : rest.slice(gap + 1).join('\n').trim();
  return { method, url: first[2].trim(), headers, body };
}

/** Separa os blocos em pares antes/depois (lado a lado) e blocos soltos, mantendo a ordem de registro. */
export type EvidenceBlockRow = { before?: EvidenceBlock; after?: EvidenceBlock; single?: EvidenceBlock };
export function groupBlocks(blocks: readonly EvidenceBlock[] | undefined): EvidenceBlockRow[] {
  const rows: EvidenceBlockRow[] = [];
  const openBefore: EvidenceBlockRow[] = [];
  for (const block of blocks ?? []) {
    if (block.phase === 'before') {
      const row: EvidenceBlockRow = { before: block };
      rows.push(row);
      openBefore.push(row);
    } else if (block.phase === 'after') {
      const row = openBefore.shift();
      if (row) row.after = block;
      else rows.push({ after: block });
    } else {
      rows.push({ single: block });
    }
  }
  return rows;
}
