import type { AuthLockoutCheckStatus, ExposureFinding, LoginOutcome } from './authLockoutTypes';
import { EXCEPTION_MESSAGE_PATTERNS, excerptAround, hasExceptionMessage } from './exceptionLeak';

export type HeaderBag = Record<string, string | string[] | undefined>;

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/;
const TOKEN_KEYS = /"(access_?token|accessToken|token|jwt|id_token|refresh_?token)"\s*:\s*"[^"]{8,}"/i;
const SESSION_COOKIE = /^(suukie|jsessionid|session|sess|sid|token|auth)/i;
const STACK_TRACE = /(\bat\s+[\w$.]+\([\w$]+\.(java|kt|groovy):\d+\)|\b[\w.]+(Exception|Error):\s|\bTraceback \(most recent call last\)|\bCaused by:\s)/;
/** Nome completo de exceção Java (`java.lang.NullPointerException`): diz a classe interna mesmo sem o stack trace. */
const JAVA_EXCEPTION_CLASS = /\b(?:java|javax|jakarta|org|com|br)\.[\w$]+(?:\.[\w$]+)*(?:Exception|Error)\b/;
const CONNECTION_STRING = /(jdbc:[a-z]+:|Data Source\s*=|User Id\s*=|Initial Catalog\s*=|\bPassword\s*=|@\/\/[\w.-]+:\d+\/|mongodb(\+srv)?:\/\/|postgres(ql)?:\/\/[^\s"]*@)/i;
const SQL_ERROR = /\b(ORA-\d{5}|PLS-\d{5}|SQLSTATE\[|SQL syntax)/;
const SERVER_VERSION = /\/\d+(\.\d+)+/;

function headerText(headers: HeaderBag | undefined, name: string): string {
  const value = headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value.join('; ') : value ?? '';
}

function cookieList(headers: HeaderBag | undefined): string[] {
  const value = headers?.['set-cookie'];
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function hasIssuedToken(body: string, headers?: HeaderBag): boolean {
  return TOKEN_KEYS.test(body) || JWT_PATTERN.test(body) || /^Bearer\s+\S+/i.test(headerText(headers, 'authorization'));
}

/** Cookie de sessão sendo gravado; um cookie que só apaga (Max-Age=0 ou valor vazio) não conta. */
export function hasSessionCookie(headers?: HeaderBag): boolean {
  return cookieList(headers).some((cookie) => {
    const [pair] = cookie.split(';');
    const [name, ...rest] = pair.split('=');
    const value = rest.join('=').trim();
    const clearing = !value || /max-age=0\b/i.test(cookie) || /expires=thu, 01 jan 1970/i.test(cookie);
    return SESSION_COOKIE.test(name.trim()) && !clearing;
  });
}

export interface LoginResponseShape {
  status: number;
  body: string;
  headers?: HeaderBag;
}

export interface LoginClassification {
  outcome: LoginOutcome;
  issuedToken: boolean;
  setSessionCookie: boolean;
}

/**
 * Token ou cookie de sessão vencem tudo: se o servidor entregou, a pessoa entrou, diga o corpo o que disser.
 * 423 e 429 são bloqueio; o padrão de texto cobre servidores que devolvem 401 com "usuário bloqueado".
 */
export function classifyLoginResponse(response: LoginResponseShape, lockedPattern: RegExp): LoginClassification {
  const issuedToken = response.status > 0 && hasIssuedToken(response.body, response.headers);
  const setSessionCookie = response.status > 0 && hasSessionCookie(response.headers);
  let outcome: LoginOutcome;
  if (response.status === 0) outcome = 'error';
  else if ((issuedToken || setSessionCookie) && response.status < 400) outcome = 'authenticated';
  else if (response.status === 423 || response.status === 429 || lockedPattern.test(response.body)) outcome = 'locked';
  else if (response.status >= 500) outcome = 'error';
  else outcome = 'rejected';
  return { outcome, issuedToken, setSessionCookie };
}

/** Regex do bloqueio informada pela pessoa; inválida volta ao padrão em vez de derrubar a execução. */
export function compileLockedPattern(source: string | undefined, fallback: string): RegExp {
  try {
    return new RegExp(source?.trim() || fallback, 'i');
  } catch {
    return new RegExp(fallback, 'i');
  }
}

export interface ExposureInput {
  body: string;
  headers?: HeaderBag;
  /** Senhas usadas na execução (certas e erradas). */
  secrets: readonly string[];
  /** Login bem-sucedido devolve token por definição: aí o token não é exposição. */
  allowToken?: boolean;
}

/** Corpo, corpo sem escapes e cabeçalhos num texto só: o que as buscas de vazamento leem. `readable` deixa de fora o corpo cru. */
function exposureText({ body, headers, allowToken }: ExposureInput, readable = false): string {
  const headerDump = Object.entries(headers ?? {})
    .filter(([name]) => name !== 'set-cookie' || !allowToken)
    .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join('; ') : value ?? ''}`)
    .join('\n');
  // Em resposta JSON o stack trace vem com as quebras escapadas ("\\n\\tat br.com..."): analisa também o texto sem os escapes
  const unescaped = body.replace(/\\[nrt]/g, ' ').replace(/\\"/g, '"');
  return readable ? `${unescaped}\n${headerDump}` : `${body}\n${unescaped}\n${headerDump}`;
}

export function detectExposure(input: ExposureInput): ExposureFinding[] {
  const { body, headers, secrets, allowToken } = input;
  const found = new Set<ExposureFinding>();
  const text = exposureText(input);
  if (STACK_TRACE.test(text) || JAVA_EXCEPTION_CLASS.test(text)) found.add('stack-trace');
  if (hasExceptionMessage(text)) found.add('exception-message');
  if (secrets.some((secret) => secret.length >= 4 && text.includes(secret))) found.add('password');
  if (!allowToken && (JWT_PATTERN.test(text) || TOKEN_KEYS.test(body))) found.add('token');
  if (CONNECTION_STRING.test(text)) found.add('connection-string');
  if (SQL_ERROR.test(text)) found.add('sql-error');
  if (SERVER_VERSION.test(headerText(headers, 'server')) || headerText(headers, 'x-powered-by')) found.add('server-version');
  return [...found];
}

/**
 * O trecho da resposta que denunciou cada achado técnico (stack trace, mensagem da exceção, erro de SQL). Senha,
 * token e string de conexão não ganham trecho: mostrar seria repetir o segredo.
 */
export function exposureExcerpts(input: ExposureInput): Partial<Record<ExposureFinding, string>> {
  // Sem os escapes do JSON: o trecho sai como o QA leria (For input string: "NUMERO")
  const text = exposureText(input, true);
  const first = (patterns: readonly RegExp[]) => patterns.map((p) => excerptAround(text, p)).find(Boolean);
  const excerpts: Partial<Record<ExposureFinding, string>> = {};
  const stack = first([JAVA_EXCEPTION_CLASS, STACK_TRACE]);
  const message = first(EXCEPTION_MESSAGE_PATTERNS);
  const sql = first([SQL_ERROR]);
  if (stack) excerpts['stack-trace'] = stack;
  if (message) excerpts['exception-message'] = message;
  if (sql) excerpts['sql-error'] = sql;
  return excerpts;
}

export const EXPOSURE_LABELS: Record<ExposureFinding, string> = {
  'stack-trace': 'stack trace',
  'exception-message': 'mensagem interna da exceção (Java/Spring)',
  password: 'senha usada no teste',
  token: 'token',
  'connection-string': 'string de conexão',
  'sql-error': 'erro de SQL do banco',
  'server-version': 'versão do servidor no cabeçalho'
};

/** `server-version` só aponta; os demais reprovam. */
export function isBlockingExposure(finding: ExposureFinding): boolean {
  return finding !== 'server-version';
}

/** Corta o corpo para o relatório, sem deixar passar senha nem token. */
export function maskSecrets(text: string, secrets: readonly string[], max = 300, keepLayout = false): string {
  let masked = text;
  for (const secret of secrets) {
    if (secret.length >= 4) masked = masked.split(secret).join('***');
  }
  masked = masked.replace(new RegExp(JWT_PATTERN.source, 'g'), 'eyJ***');
  masked = masked.replace(/("(?:access_?token|accessToken|token|jwt|id_token|refresh_?token)"\s*:\s*")[^"]+"/gi, '$1***"');
  // `keepLayout` preserva as quebras de linha (corpo JSON formatado); o padrão achata para caber numa linha
  const flat = keepLayout ? masked : masked.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export interface DurationProbe {
  /** Segundos desde o bloqueio. */
  offsetSeconds: number;
  blocked: boolean;
}

export interface Verdict {
  status: AuthLockoutCheckStatus;
  summary: string;
}

/** Bloqueio liberado entre a última sonda bloqueada e a primeira liberada; compara com as durações candidatas. */
export function evaluateLockDuration(probes: readonly DurationProbe[], candidatesMinutes: readonly number[], marginSeconds: number): Verdict {
  if (probes.length === 0) return { status: 'warning', summary: 'Nenhuma sonda foi feita depois do bloqueio.' };
  const sorted = [...probes].sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  const minLock = Math.min(...candidatesMinutes) * 60;
  const maxLock = Math.max(...candidatesMinutes) * 60;
  const firstFree = sorted.find((p) => !p.blocked);
  const lastBlocked = [...sorted].reverse().find((p) => p.blocked && (!firstFree || p.offsetSeconds < firstFree.offsetSeconds));
  if (!firstFree) {
    const last = sorted[sorted.length - 1].offsetSeconds;
    return {
      status: last >= maxLock ? 'failed' : 'warning',
      summary: `Continuou bloqueada até a última sonda (${last}s após o bloqueio), além de ${maxLock / 60} min. Se o servidor conta a tentativa durante o bloqueio, cada sonda pode estar renovando o prazo.`
    };
  }
  if (firstFree.offsetSeconds < minLock - marginSeconds) {
    return { status: 'failed', summary: `Liberou cedo: já entrou ${firstFree.offsetSeconds}s após o bloqueio, antes de ${minLock / 60} min.` };
  }
  const range = `${lastBlocked ? `${lastBlocked.offsetSeconds}s` : 'o bloqueio'} e ${firstFree.offsetSeconds}s`;
  const match = candidatesMinutes.find((m) => (!lastBlocked || lastBlocked.offsetSeconds < m * 60 + marginSeconds) && firstFree.offsetSeconds >= m * 60 - marginSeconds);
  return {
    status: 'passed',
    summary: `Liberou entre ${range} após o bloqueio${match ? `: compatível com ${match} min` : ''}.`
  };
}

export interface WindowObservation {
  windowSeconds: number;
  threshold: number;
  /** A senha certa foi recusada ao fim da sequência. */
  blockedAtEnd: boolean;
  /** A falha logo após o fim da janela já veio como bloqueio (só dá para saber se o servidor diferencia a mensagem). */
  lockedRightAfterWindow: boolean;
}

export function interpretCountWindow(o: WindowObservation): Verdict {
  const before = o.threshold - 1;
  const base = `${before} falhas dentro de ${o.windowSeconds}s e 2 logo depois do limite`;
  if (!o.blockedAtEnd) {
    return {
      status: 'info',
      summary: `${base}: não bloqueou. Compatível com janela fixa contada a partir da primeira falha (as falhas antigas saíram da contagem).`
    };
  }
  if (o.lockedRightAfterWindow) {
    return {
      status: 'info',
      summary: `${base}: bloqueou já na ${o.threshold}ª falha, mesmo com a primeira fora da janela. Compatível com contagem sem janela (acumulada).`
    };
  }
  return {
    status: 'info',
    summary: `${base}: bloqueou. Compatível com janela deslizante de ${o.windowSeconds}s (ou contagem acumulada, se o servidor não diferencia a mensagem de bloqueio).`
  };
}

const FAILURE_WORDS = /(senha|password|inv[aá]lid|incorret|falh|fail|bloque|lock|unauthori|negad|denied|401|403)/i;

/** Linhas que citam o login junto com uma palavra de falha de autenticação. */
export function countLoginFailureMentions(lines: readonly string[], login: string): number {
  if (!login) return 0;
  const needle = login.toLowerCase();
  return lines.filter((line) => line.toLowerCase().includes(needle) && FAILURE_WORDS.test(line)).length;
}

export function evaluateMentions(source: string, mentions: number, expected: number): Verdict {
  if (expected === 0) return { status: 'info', summary: `${source}: nenhuma falha enviada para correlacionar.` };
  if (mentions >= expected) return { status: 'passed', summary: `${source}: ${mentions} linha(s) para ${expected} falha(s) enviada(s).` };
  if (mentions === 0) {
    return {
      status: 'warning',
      summary: `${source}: nenhuma linha cita o usuário junto com falha de login. O log pode não registrar a falha ou usar outro identificador; confira à mão.`
    };
  }
  return { status: 'failed', summary: `${source}: só ${mentions} linha(s) para ${expected} falha(s) enviada(s). Eventos perdidos?` };
}

const SEVERITY: Record<AuthLockoutCheckStatus, number> = {
  failed: 6,
  warning: 5,
  manual: 4,
  info: 3,
  passed: 2,
  skipped: 1,
  running: 0,
  pending: 0
};

/** O pior status vence (falha > aviso > manual > info > ok). */
export function worstStatus(statuses: readonly AuthLockoutCheckStatus[]): AuthLockoutCheckStatus {
  return statuses.reduce<AuthLockoutCheckStatus>((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), statuses[0] ?? 'skipped');
}
