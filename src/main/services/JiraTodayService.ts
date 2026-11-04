import type { AppSettings, JiraSourceConfig } from '../../shared/types';
import {
  JQL_DUE_SOON,
  JQL_IN_PROGRESS,
  activeSprintId,
  describeJiraError,
  emptyJiraToday,
  findSprintFieldId,
  isoDay,
  jqlSprintAll,
  jqlSprintDone,
  jqlWorklogsSince,
  lastWorkedFrom,
  mondayOf,
  pickJiraSource,
  sumMyWorklogs,
  toJiraIssue,
  worklogSince,
  type JiraTodayReport,
  type Me,
  type RawWorklog
} from '../../shared/jiraToday';
import { isSafeUrl } from '../utils/security';

const CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 15000;
const ISSUE_FIELDS = ['summary', 'status', 'duedate'];
/** Issues com worklog truncado cuja lista completa buscamos à parte (cada uma é uma chamada a mais). */
const MAX_WORKLOG_FETCHES = 8;

interface SearchResult {
  issues?: { key?: string; fields?: Record<string, unknown> }[];
  total?: number;
}

/**
 * Jira da tela de início, com a credencial da primeira fonte Jira ativa (a mesma da busca de documentação). Guarda a
 * resposta por 5 minutos: a tela abre todo dia e o Jira responde 429 se for consultado a cada abertura. Cada parte
 * (sprint, worklogs) falha sozinha; só a busca de "em andamento" derruba o cartão. No Electron, quem cria o service passa
 * o `net.fetch`, que usa o proxy e os certificados do Windows (a CA da empresa) sem desligar a validação.
 */
export class JiraTodayService {
  private cache: { at: number; sourceId: string; report: JiraTodayReport } | null = null;

  constructor(
    private readonly getSettings: () => AppSettings,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date()
  ) {}

  public async getToday(force = false): Promise<JiraTodayReport> {
    const source = pickJiraSource(this.getSettings().jiraSources);
    if (!source) return emptyJiraToday();
    if (!isSafeUrl(source.baseUrl)) return emptyJiraToday({ configured: true, error: 'A URL da fonte Jira não é válida.' });
    if (!force && this.cache && this.cache.sourceId === source.id && Date.now() - this.cache.at < CACHE_MS) return this.cache.report;

    let report: JiraTodayReport;
    try {
      report = await this.load(source);
    } catch (err) {
      return emptyJiraToday({ configured: true, sourceName: source.name, error: describeJiraError(err) });
    }
    this.cache = { at: Date.now(), sourceId: source.id, report };
    return report;
  }

  private async load(source: JiraSourceConfig): Promise<JiraTodayReport> {
    const now = this.now();
    const [me, sprintFieldId] = await Promise.all([
      this.get<Me>(source, '/rest/api/2/myself'),
      this.get<unknown>(source, '/rest/api/2/field').then(findSprintFieldId, () => null)
    ]);
    const fields = sprintFieldId ? [...ISSUE_FIELDS, sprintFieldId] : ISSUE_FIELDS;
    const [inProgress, due] = await Promise.all([
      this.search(source, JQL_IN_PROGRESS, fields, 10),
      this.search(source, JQL_DUE_SOON, ISSUE_FIELDS, 10).catch(() => ({ issues: [] }) as SearchResult)
    ]);
    const toIssue = (raw: { key?: string; fields?: Record<string, unknown> }) => toJiraIssue(raw, source.baseUrl);
    const inProgressIssues = (inProgress.issues ?? []).map(toIssue);

    const [work, sprint] = await Promise.all([
      this.loadWorklogs(source, me, now).catch(() => null),
      this.loadSprint(source, activeSprintId(inProgress.issues ?? [], sprintFieldId)).catch(() => undefined)
    ]);
    const monday = isoDay(mondayOf(now));
    const secondsByDay = Object.fromEntries(Object.entries(work?.byDay ?? {}).filter(([day]) => day >= monday));
    const lastWorked = work?.lastWorked ?? (inProgressIssues[0] ? { issue: inProgressIssues[0], seconds: 0 } : undefined);

    return {
      success: true,
      configured: true,
      sourceName: source.name,
      inProgress: inProgressIssues,
      dueSoon: (due.issues ?? []).map(toIssue),
      lastWorked,
      secondsByDay,
      weekSeconds: Object.values(secondsByDay).reduce((a, b) => a + b, 0),
      sprint
    };
  }

  private async loadWorklogs(source: JiraSourceConfig, me: Me, now: Date) {
    const since = worklogSince(now);
    const result = await this.search(source, jqlWorklogsSince(since), [...ISSUE_FIELDS, 'worklog'], 50);
    const issues = result.issues ?? [];
    let extraFetches = 0;
    const entries = await Promise.all(
      issues.map(async (raw) => {
        const wl = raw.fields?.worklog as { worklogs?: RawWorklog[]; total?: number } | undefined;
        let worklogs = wl?.worklogs ?? [];
        if ((wl?.total ?? 0) > worklogs.length && raw.key && extraFetches++ < MAX_WORKLOG_FETCHES) {
          const full = await this.get<{ worklogs?: RawWorklog[] }>(source, `/rest/api/2/issue/${encodeURIComponent(raw.key)}/worklog`).catch(() => null);
          worklogs = full?.worklogs ?? worklogs;
        }
        return { issue: toJiraIssue(raw, source.baseUrl), worklogs };
      })
    );
    return { byDay: sumMyWorklogs(entries.flatMap((e) => e.worklogs), me, since), lastWorked: lastWorkedFrom(entries, me) };
  }

  private async loadSprint(source: JiraSourceConfig, sprintId: number | null) {
    if (!sprintId) return undefined;
    const [info, all, done] = await Promise.all([
      this.get<{ name?: string; endDate?: string }>(source, `/rest/agile/1.0/sprint/${sprintId}`),
      this.search(source, jqlSprintAll(sprintId), ['status'], 0),
      this.search(source, jqlSprintDone(sprintId), ['status'], 0)
    ]);
    return { name: String(info.name ?? ''), endDate: info.endDate, total: all.total ?? 0, done: done.total ?? 0 };
  }

  private search(source: JiraSourceConfig, jql: string, fields: string[], maxResults: number): Promise<SearchResult> {
    const q = `jql=${encodeURIComponent(jql)}&fields=${encodeURIComponent(fields.join(','))}&maxResults=${maxResults}`;
    return this.get<SearchResult>(source, `/rest/api/2/search?${q}`);
  }

  private async get<T>(source: JiraSourceConfig, pathAndQuery: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${source.baseUrl.replace(/\/+$/, '')}${pathAndQuery}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json', Authorization: `Bearer ${source.authToken}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
