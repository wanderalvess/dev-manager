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
  /** Regras de aprovação, uma por linha (ver evaluateChecks). Avaliadas a cada gravação do bloco. */
  checks?: string;
  /** Resultado da última avaliação das regras; ausente quando não há regras. */
  verdict?: EvidenceBlockVerdict;
  /** api: nome do ambiente do API Studio usado nas variáveis {{...}}. */
  environment?: string;
  createdAt: string;
}

export interface EvidenceCheckResult {
  rule: string;
  ok: boolean;
  detail: string;
}
export interface EvidenceBlockVerdict {
  passed: boolean;
  results: EvidenceCheckResult[];
}

/** Ação de entrada reproduzível: o roteiro de um passo. Não há captura de teclado: digitação só existe se o usuário escrever. */
export type EvidenceActionType = 'click' | 'type' | 'key' | 'wait';

/** Janela onde o clique foi gravado: na reexecução o clique é refeito a partir do canto dela, esteja onde estiver. */
export interface EvidenceWindowRef {
  /** Nome do processo (sem .exe), ex.: "chrome". */
  process: string;
  /** Título da janela quando gravou; a reexecução prefere a janela de mesmo título e cai na primeira do processo. */
  title: string;
  /** Distância em pixels físicos do canto superior esquerdo da janela. */
  dx: number;
  dy: number;
}

export interface EvidenceAction {
  id: string;
  type: EvidenceActionType;
  /** click: posição em pixels físicos da área de trabalho virtual (pode ser negativa em monitores à esquerda/acima). */
  x?: number;
  y?: number;
  /** click: janela de origem; quando presente, tem prioridade sobre x/y na reexecução. */
  win?: EvidenceWindowRef;
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

function sanitizeWindowRef(raw: unknown): EvidenceWindowRef | undefined {
  const w = (raw ?? {}) as Partial<EvidenceWindowRef>;
  const dx = clampInt(w.dx, -20000, 20000);
  const dy = clampInt(w.dy, -20000, 20000);
  if (typeof w.process !== 'string' || !w.process.trim() || dx === undefined || dy === undefined) return undefined;
  return { process: w.process.trim().slice(0, 100), title: typeof w.title === 'string' ? w.title.slice(0, 200) : '', dx, dy };
}

/** Valida o que veio do renderer: descarta ação malformada e limita tamanhos. */
export function sanitizeActions(raw: unknown, makeId: () => string): EvidenceAction[] {
  if (!Array.isArray(raw)) return [];
  const out: EvidenceAction[] = [];
  for (const item of raw.slice(0, EVIDENCE_MAX_ACTIONS)) {
    const a = (item ?? {}) as Partial<EvidenceAction>;
    const id = typeof a.id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(a.id) ? a.id : makeId();
    if (a.type === 'click') {
      // Monitores à esquerda/acima do principal têm coordenadas negativas na área de trabalho virtual.
      const x = clampInt(a.x, -20000, 20000);
      const y = clampInt(a.y, -20000, 20000);
      if (x !== undefined && y !== undefined) {
        const click: EvidenceAction = { id, type: 'click', x, y, button: a.button === 'right' ? 'right' : 'left' };
        const win = sanitizeWindowRef(a.win);
        if (win) click.win = win;
        out.push(click);
      }
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
      return a.win
        ? `${a.button === 'right' ? 'Clique direito' : 'Clique'} em ${a.win.process} (+${a.win.dx}, +${a.win.dy})`
        : `${a.button === 'right' ? 'Clique direito' : 'Clique'} em (${a.x}, ${a.y})`;
    case 'type':
      return `Digitar "${(a.text ?? '').length > 30 ? `${(a.text ?? '').slice(0, 30)}…` : a.text}"`;
    case 'key':
      return `Tecla ${a.key}`;
    default:
      return `Esperar ${a.ms} ms`;
  }
}

export type EvidenceBlockInput = Pick<EvidenceBlock, 'kind' | 'phase' | 'title' | 'request' | 'response' | 'meta' | 'checks' | 'environment'>;

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

export type EvidenceLinkKind = 'pr' | 'video' | 'api' | 'other';

/** Link opcional da evidência: PR de uma versão, vídeo hospedado fora do Hub, URL da API, documentação etc. */
export interface EvidenceLink {
  id: string;
  kind: EvidenceLinkKind;
  /** Ex.: "Versão 2.1.0" ou "Gravação do teste". */
  label?: string;
  url: string;
}

export const EVIDENCE_LINK_KINDS: readonly EvidenceLinkKind[] = ['pr', 'video', 'api', 'other'];
export const LINK_KIND_LABEL: Record<EvidenceLinkKind, string> = { pr: 'Pull request', video: 'Vídeo', api: 'API', other: 'Link' };
export const EVIDENCE_MAX_LINKS = 20;

/**
 * Aceita só http(s) (o relatório vira HTML clicável: nada de javascript: ou file:), sem usuário/senha na URL.
 * "github.com/x/pull/1" ganha https://. Colchetes e barra vertical no caminho são codificados para não quebrarem
 * o link do Jira. Devolve null quando não dá para usar.
 */
export function normalizeLinkUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let text = raw.trim();
  if (!text || text.length > 800) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text) && /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]|$)/.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return null;
  const rest = `${url.pathname}${url.search}${url.hash}`.replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/\|/g, '%7C');
  return `${url.origin}${rest}`;
}

/** Valida os links vindos do renderer ou do disco: descarta URL inválida e limita tamanhos. */
export function sanitizeLinks(raw: unknown, makeId: () => string): EvidenceLink[] {
  if (!Array.isArray(raw)) return [];
  const out: EvidenceLink[] = [];
  for (const item of raw.slice(0, EVIDENCE_MAX_LINKS)) {
    const l = (item ?? {}) as Partial<EvidenceLink>;
    const url = normalizeLinkUrl(l.url);
    if (!url) continue;
    const label = typeof l.label === 'string' ? l.label.replace(/[\r\n]+/g, ' ').trim().slice(0, 100) : '';
    const id = typeof l.id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(l.id) ? l.id : makeId();
    out.push({ id, kind: EVIDENCE_LINK_KINDS.includes(l.kind as EvidenceLinkKind) ? (l.kind as EvidenceLinkKind) : 'other', ...(label ? { label } : {}), url });
  }
  return out;
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
  /** Links opcionais (PRs das versões, vídeos externos, URL da API): vão para o relatório e para o comentário do Jira. */
  links?: EvidenceLink[];
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
  links?: EvidenceLink[];
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

export interface EvidenceJiraPreviewAttachment {
  name: string;
  kind: 'report' | 'video';
  sizeBytes?: number;
  /** Vídeo acima do limite: não será anexado. */
  skipped?: boolean;
}

/** O que a publicação no Jira vai enviar, calculado sem enviar nada: o comentário exato e a lista de anexos. */
export interface EvidenceJiraPreview {
  comment: string;
  attachments: EvidenceJiraPreviewAttachment[];
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

const SECRET_HEADER = /^(\s*(?:authorization|proxy-authorization|cookie|x-api-key|x-auth-token|apikey)\s*:\s*)(.+)$/i;

/**
 * O relatório (HTML/PDF) e o anexo do Jira levam o texto da requisição: credenciais digitadas em claro não podem ir junto.
 * Valores com {{variável}} (ex.: Bearer {{TOKEN}}) ficam como estão, pois o segredo real nunca é gravado.
 */
export function maskSecretHeaders(headers: string | undefined): string {
  return (headers ?? '')
    .split(/\r?\n/)
    .map((line) => {
      const m = SECRET_HEADER.exec(line);
      if (!m || m[2].includes('{{')) return line;
      const scheme = /^(bearer|basic|token)\s+/i.exec(m[2])?.[0] ?? '';
      return `${m[1]}${scheme}${m[2].slice(scheme.length, scheme.length + 4)}…(oculto)`;
    })
    .join('\n');
}

/** Monta os campos de um bloco "api" a partir de uma chamada HTTP já executada. */
export function formatHttpExchange(x: EvidenceHttpExchange): Pick<EvidenceBlock, 'request' | 'response' | 'meta'> {
  const request = [`${x.method} ${x.url}`, maskSecretHeaders(x.headers).trim(), x.body?.trim() ? `\n${prettyJson(x.body.trim())}` : '']
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

export const EVIDENCE_CHECKS_HELP =
  'Uma regra por linha: status 200 | status 2xx | contem texto | nao contem texto | linhas >= 1 | tempo < 500 | json data.status = OK';

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const compare = (actual: number, op: string, expected: number): boolean => {
  switch (op) {
    case '=':
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '>':
      return actual > expected;
    case '>=':
      return actual >= expected;
    case '<':
      return actual < expected;
    default:
      return actual <= expected;
  }
};

const jsonPath = (root: unknown, path: string): unknown =>
  path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((cur, key) => (cur !== null && typeof cur === 'object' ? (cur as Record<string, unknown>)[key] : undefined), root);

/**
 * Avalia as regras de aprovação de uma prova contra o que foi registrado (meta e resposta), sem rodar nada.
 * Regra desconhecida reprova com uma explicação, para um erro de digitação nunca virar "aprovado".
 */
export function evaluateChecks(checks: string | undefined, data: { response?: string; meta?: string }): EvidenceBlockVerdict | undefined {
  const rules = (checks ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rules.length === 0) return undefined;
  const response = data.response ?? '';
  const meta = data.meta ?? '';
  let parsed: unknown;
  let parsedOk = false;
  try {
    parsed = JSON.parse(response);
    parsedOk = true;
  } catch {
    /* resposta não é JSON: regras "json" reprovam abaixo */
  }
  const results = rules.map((rule): EvidenceCheckResult => {
    const fail = (detail: string): EvidenceCheckResult => ({ rule, ok: false, detail });
    const pass = (detail: string): EvidenceCheckResult => ({ rule, ok: true, detail });
    const norm = stripAccents(rule);

    const status = /^status\s+(\d{3}|[1-5]xx)$/i.exec(norm);
    if (status) {
      const real = /^(\d{3})\b/.exec(meta)?.[1];
      if (!real) return fail('Sem status registrado na prova.');
      const want = status[1].toLowerCase();
      const ok = want.endsWith('xx') ? real[0] === want[0] : real === want;
      return ok ? pass(`status ${real}`) : fail(`status ${real}`);
    }
    const contains = /^(nao\s+)?contem\s+(.+)$/i.exec(norm);
    if (contains) {
      const needle = rule.slice(rule.search(/contém|contem/i) + 6).trim().toLowerCase();
      const has = response.toLowerCase().includes(needle);
      const negate = !!contains[1];
      if (needle === 'texto') return fail('"texto" é só um exemplo: troque pelo que deve aparecer na resposta (ex.: contem idCargaInicial).');
      return has !== negate ? pass(negate ? 'ausente, como esperado' : 'encontrado') : fail(negate ? 'presente na resposta' : 'não encontrado na resposta');
    }
    const num = /^(linhas|tempo)\s*(>=|<=|==|!=|=|<|>)\s*(\d+)\s*(?:ms)?$/i.exec(norm);
    if (num) {
      const isRows = num[1].toLowerCase() === 'linhas';
      const real = isRows ? /(\d+)\s+linha/i.exec(meta)?.[1] : /(\d+)\s*ms/i.exec(meta)?.[1];
      if (real === undefined) return fail(`Sem ${isRows ? 'contagem de linhas' : 'tempo'} registrado na prova.`);
      return compare(Number(real), num[2], Number(num[3])) ? pass(`${real}${isRows ? ' linha(s)' : ' ms'}`) : fail(`${real}${isRows ? ' linha(s)' : ' ms'}`);
    }
    const js = /^json\s+(\S+)\s*(=|!=)\s*(.+)$/i.exec(rule.replace(/^JSON/i, 'json'));
    if (js) {
      if (!parsedOk) return fail('A resposta não é JSON.');
      const real = jsonPath(parsed, js[1]);
      const shown = real === undefined ? 'inexistente' : typeof real === 'object' ? JSON.stringify(real) : String(real);
      const want = js[3].trim().replace(/^["']|["']$/g, '');
      const equal = shown === want;
      return equal === (js[2] === '=') ? pass(shown) : fail(shown);
    }
    return fail('Regra não reconhecida. ' + EVIDENCE_CHECKS_HELP);
  });
  return { passed: results.every((r) => r.ok), results };
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

/** Quebra a linha de comando do cURL em argumentos, entendendo '...', "...", $'...' e a continuação com \ ou ^ no fim da linha. */
function tokenizeCommand(input: string): string[] {
  // "Copiar como cURL (cmd)" do Chrome escapa com ^ e quebra linha com ^: desfaz antes de separar os argumentos.
  const text = /\^(["\r\n^&|<>])/.test(input) ? input.replace(/\^(\r?\n)/g, ' ').replace(/\^(.)/g, '$1') : input;
  const tokens: string[] = [];
  let cur = '';
  let has = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\' && /[\r\n]/.test(text[i + 1] ?? '')) {
      i += text[i + 1] === '\r' && text[i + 2] === '\n' ? 2 : 1;
      continue;
    }
    if (c === "'" || (c === '$' && text[i + 1] === "'")) {
      const ansi = c === '$';
      i += ansi ? 2 : 1;
      has = true;
      while (i < text.length && text[i] !== "'") {
        if (ansi && text[i] === '\\' && i + 1 < text.length) {
          const n = text[++i];
          cur += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
        } else cur += text[i];
        i++;
      }
    } else if (c === '"') {
      has = true;
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\' && /["\\$`]/.test(text[i + 1] ?? '')) i++;
        cur += text[i];
        i++;
      }
    } else if (/\s/.test(c)) {
      if (has) tokens.push(cur);
      cur = '';
      has = false;
    } else {
      cur += c;
      has = true;
    }
  }
  if (has) tokens.push(cur);
  return tokens;
}

const CURL_IGNORED_WITH_VALUE = new Set(['-o', '--output', '-m', '--max-time', '--connect-timeout', '-x', '--proxy', '-A', '--user-agent', '-e', '--referer', '--cacert', '--cert', '--key', '-w', '--write-out']);

/**
 * Lê um comando cURL (ou um texto "MÉTODO url" simples) e devolve os campos do formulário da prova de API.
 * Método ausente vira GET, ou POST quando há corpo. Retorna null se o texto não parece uma requisição.
 */
export function parseCurlCommand(input: string | undefined): { method: EvidenceHttpMethod; url: string; headers: string; body: string } | null {
  const text = (input ?? '').trim();
  if (!/^curl(\.exe)?\s/i.test(text)) return parseHttpRequestText(text);
  const tokens = tokenizeCommand(text).slice(1);
  let method: string | undefined;
  let url = '';
  const headers: string[] = [];
  const data: string[] = [];
  let user: string | undefined;
  let cookie: string | undefined;
  let forceGet = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const eq = t.startsWith('--') ? t.indexOf('=') : -1;
    const flag = eq > 0 ? t.slice(0, eq) : t;
    const value = (): string => (eq > 0 ? t.slice(eq + 1) : (tokens[++i] ?? ''));
    if (flag === '-X' || flag === '--request') method = value().toUpperCase();
    else if (flag === '-H' || flag === '--header') headers.push(value().trim());
    else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode'].includes(flag)) data.push(value());
    else if (flag === '-u' || flag === '--user') user = value();
    else if (flag === '-b' || flag === '--cookie') cookie = value();
    else if (flag === '--url') url = value();
    else if (flag === '-I' || flag === '--head') method = 'HEAD';
    else if (flag === '-G' || flag === '--get') forceGet = true;
    else if (CURL_IGNORED_WITH_VALUE.has(flag)) value();
    else if (!t.startsWith('-') && !url) url = t;
  }
  if (!url) return null;
  if (user && !headers.some((h) => /^authorization\s*:/i.test(h))) {
    headers.push(`Authorization: Basic ${typeof btoa === 'function' ? btoa(user) : Buffer.from(user).toString('base64')}`);
  }
  if (cookie && !headers.some((h) => /^cookie\s*:/i.test(h))) headers.push(`Cookie: ${cookie}`);
  let body = data.join('&');
  if (forceGet && body) {
    url += (url.includes('?') ? '&' : '?') + body;
    body = '';
  }
  const resolved = (method ?? (body ? 'POST' : 'GET')) as EvidenceHttpMethod;
  return { method: HTTP_METHODS.includes(resolved) ? resolved : 'GET', url, headers: headers.join('\n'), body };
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
