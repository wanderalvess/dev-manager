// Jira na tela de início: o que é útil ver ao abrir o dia (issues em andamento, prazos, onde parei, horas da semana e a
// sprint). Só tipos e contas puras; quem chama o Jira é o JiraTodayService. Contrato confirmado no agile-space-backend
// (JiraService.java): Jira Server/Data Center, REST v2 + Agile 1.0, Bearer com o PAT de cada pessoa.
import type { JiraSourceConfig } from './types';

export interface JiraTodayIssue {
  key: string;
  summary: string;
  status: string;
  /** Categoria do status no Jira: new, indeterminate (em andamento) ou done */
  statusCategory: string;
  dueDate?: string;
  url: string;
}

export interface JiraTodaySprint {
  name: string;
  endDate?: string;
  /** Issues da sprint (do time todo) concluídas e no total */
  done: number;
  total: number;
}

export interface JiraLastWorked {
  issue: JiraTodayIssue;
  /** Dia (AAAA-MM-DD) do último lançamento da pessoa nessa issue; ausente quando veio só de "em andamento" */
  day?: string;
  /** Horas que a pessoa lançou nesse dia, em segundos (o timespent da issue é de todo mundo) */
  seconds: number;
}

export interface JiraTodayReport {
  success: boolean;
  /** false quando não há fonte Jira ativa com URL e token nas configurações */
  configured: boolean;
  error?: string;
  sourceName?: string;
  inProgress: JiraTodayIssue[];
  /** Vence hoje ou já venceu, sem resolução */
  dueSoon: JiraTodayIssue[];
  lastWorked?: JiraLastWorked;
  /** Segundos lançados pela pessoa por dia (AAAA-MM-DD), da segunda-feira até hoje */
  secondsByDay: Record<string, number>;
  weekSeconds: number;
  sprint?: JiraTodaySprint;
}

export const JQL_IN_PROGRESS = 'assignee = currentUser() AND statusCategory = "In Progress" ORDER BY updated DESC';
export const JQL_DUE_SOON = 'assignee = currentUser() AND resolution = Unresolved AND duedate <= endOfDay() ORDER BY duedate ASC';
export const SPRINT_FIELD_SCHEMA = 'com.pyxis.greenhopper.jira:gh-sprint';

export const jqlWorklogsSince = (day: string): string => `worklogAuthor = currentUser() AND worklogDate >= "${day}" ORDER BY updated DESC`;
export const jqlSprintAll = (sprintId: number): string => `sprint = ${sprintId}`;
export const jqlSprintDone = (sprintId: number): string => `sprint = ${sprintId} AND statusCategory = Done`;

export const emptyJiraToday = (patch: Partial<JiraTodayReport> = {}): JiraTodayReport => ({
  success: false,
  configured: false,
  inProgress: [],
  dueSoon: [],
  secondsByDay: {},
  weekSeconds: 0,
  ...patch
});

/** Primeira fonte Jira ativa com URL e token: a mesma credencial cadastrada para a busca de documentação. */
export function pickJiraSource(sources: JiraSourceConfig[] | undefined): JiraSourceConfig | null {
  return (sources ?? []).find((s) => s.enabled && !!s.baseUrl?.trim() && !!s.authToken?.trim()) ?? null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local em AAAA-MM-DD. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Segunda-feira da semana de `now` (a semana do Jira, startOfWeek, começa no domingo; aqui contamos dias úteis). */
export function mondayOf(now: Date): Date {
  const back = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
}

/** Desde quando ler worklogs: a segunda-feira ou ontem, o que vier antes (na segunda, "ontem" é domingo). */
export function worklogSince(now: Date): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const monday = mondayOf(now);
  return isoDay(yesterday < monday ? yesterday : monday);
}

interface RawIssue {
  key?: string;
  fields?: Record<string, unknown> & {
    summary?: string;
    duedate?: string | null;
    status?: { name?: string; statusCategory?: { key?: string } };
  };
}

export function toJiraIssue(raw: RawIssue, baseUrl: string): JiraTodayIssue {
  const f = raw.fields ?? {};
  const key = String(raw.key ?? '');
  return {
    key,
    summary: String(f.summary ?? ''),
    status: String(f.status?.name ?? ''),
    statusCategory: String(f.status?.statusCategory?.key ?? ''),
    dueDate: f.duedate ? String(f.duedate) : undefined,
    url: `${baseUrl.replace(/\/+$/, '')}/browse/${encodeURIComponent(key)}`
  };
}

/** ID do campo Sprint, que muda de uma instância para outra. */
export function findSprintFieldId(fields: unknown): string | null {
  if (!Array.isArray(fields)) return null;
  const hit = fields.find((f) => (f as { schema?: { custom?: string } })?.schema?.custom === SPRINT_FIELD_SCHEMA) as { id?: string } | undefined;
  return hit?.id ?? null;
}

export interface SprintRef {
  id: number;
  state: string;
  name: string;
}

/**
 * Valor do campo Sprint de uma issue. O Jira Server antigo devolve strings Java
 * ("...Sprint@1a2b[id=123,rapidViewId=4,state=ACTIVE,name=Sprint 42,...]"); versões novas devolvem objetos.
 */
export function parseSprintField(value: unknown): SprintRef[] {
  if (!Array.isArray(value)) return [];
  const out: SprintRef[] = [];
  for (const v of value) {
    if (typeof v === 'string') {
      const id = Number(/[[,]id=(\d+)/.exec(v)?.[1]);
      const state = /[[,]state=([A-Z_]+)/.exec(v)?.[1] ?? '';
      const name = /[[,]name=([^,\]]*)/.exec(v)?.[1] ?? '';
      if (Number.isFinite(id) && id > 0) out.push({ id, state, name });
    } else if (v && typeof v === 'object') {
      const o = v as { id?: unknown; state?: unknown; name?: unknown };
      const id = Number(o.id);
      if (Number.isFinite(id) && id > 0) out.push({ id, state: String(o.state ?? ''), name: String(o.name ?? '') });
    }
  }
  return out;
}

/** A sprint ativa que aparece primeiro entre as issues (as issues vêm na ordem de relevância). */
export function activeSprintId(issues: RawIssue[], sprintFieldId: string | null): number | null {
  if (!sprintFieldId) return null;
  for (const issue of issues) {
    const active = parseSprintField(issue.fields?.[sprintFieldId]).find((s) => s.state.toUpperCase() === 'ACTIVE');
    if (active) return active.id;
  }
  return null;
}

export interface RawWorklog {
  author?: { name?: string; key?: string };
  started?: string;
  timeSpentSeconds?: number;
}

export interface Me {
  name?: string;
  key?: string;
}

const isMine = (w: RawWorklog, me: Me): boolean =>
  (!!me.name && w.author?.name === me.name) || (!!me.key && w.author?.key === me.key);

/** Dia do lançamento como a pessoa lançou ("2026-11-03T09:00:00.000-0300" → "2026-11-03"). */
const logDay = (w: RawWorklog): string => String(w.started ?? '').slice(0, 10);

/** Soma os lançamentos da pessoa por dia, a partir de `since` (inclusive). */
export function sumMyWorklogs(worklogs: RawWorklog[], me: Me, since: string): Record<string, number> {
  const byDay: Record<string, number> = {};
  for (const w of worklogs) {
    const day = logDay(w);
    if (!isMine(w, me) || day < since || !(w.timeSpentSeconds! > 0)) continue;
    byDay[day] = (byDay[day] ?? 0) + w.timeSpentSeconds!;
  }
  return byDay;
}

/** A issue em que a pessoa lançou por último, com o total lançado nela naquele dia. */
export function lastWorkedFrom(entries: { issue: JiraTodayIssue; worklogs: RawWorklog[] }[], me: Me): JiraLastWorked | undefined {
  let best: { issue: JiraTodayIssue; started: string } | undefined;
  for (const { issue, worklogs } of entries) {
    for (const w of worklogs) {
      if (!isMine(w, me) || !w.started) continue;
      if (!best || w.started > best.started) best = { issue, started: w.started };
    }
  }
  if (!best) return undefined;
  const day = best.started.slice(0, 10);
  const own = entries.find((e) => e.issue.key === best!.issue.key)?.worklogs ?? [];
  return { issue: best.issue, day, seconds: sumMyWorklogs(own, me, day)[day] ?? 0 };
}

/** Mensagem para quem vê a tela: nunca inclui o token nem a JQL. */
export function describeJiraError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const status = Number(/HTTP (\d{3})/.exec(msg)?.[1]);
  if (status === 401 || status === 403) return `O Jira recusou o token (HTTP ${status}). Confira o token em Documentação › Confluence & Jira.`;
  if (status === 429) return 'O Jira pediu para esperar (HTTP 429). Tente de novo em alguns minutos.';
  if (status) return `O Jira respondeu HTTP ${status}.`;
  if (/abort/i.test(msg)) return 'O Jira demorou demais para responder.';
  return 'Não consegui falar com o Jira. Confira a rede ou a VPN.';
}
