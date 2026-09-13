import { DocSource, DocSourceEntry } from './DocSource';
import { httpRequest } from '../../utils/httpRequest';
import { JiraSourceConfig } from '../../../shared/types';

interface JiraCommentBody {
  body?: string;
  author?: { displayName?: string };
}

interface JiraIssueFields {
  summary?: string;
  description?: string;
  updated?: string;
  comment?: { comments?: JiraCommentBody[] };
}

interface JiraIssue {
  key: string;
  fields: JiraIssueFields;
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

const PAGE_SIZE = 50;
/** Limite de segurança para não paginar indefinidamente um projeto absurdamente grande. */
const MAX_PAGES_TO_FETCH = 200;

/**
 * Fonte de documentação a partir de um projeto/JQL do Jira, via REST API v2
 * (`/rest/api/2/search` + `/rest/api/2/issue/{key}`). Contrato HTTP confirmado em
 * agile-space-backend (JiraService.java): Bearer token, sem Confluence-style Basic auth
 * por e-mail — diferente de ConfluenceSource nesse ponto. Implementa o mesmo contrato
 * `DocSource` usado por LocalFolderSource/ConfluenceSource: cada issue vira um "documento"
 * (título = summary, conteúdo = descrição + comentários).
 */
export class JiraSource implements DocSource {
  readonly id: string;
  readonly label: string;

  constructor(private readonly config: JiraSourceConfig) {
    this.id = `jira:${config.baseUrl}:${config.projectKey || config.jql || 'all'}`;
    this.label = config.name || config.projectKey || 'Jira';
  }

  private authHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${this.config.authToken}`
    };
  }

  private apiUrl(pathAndQuery: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    return `${base}${pathAndQuery}`;
  }

  private effectiveJql(): string {
    if (this.config.jql && this.config.jql.trim()) return this.config.jql.trim();
    if (this.config.projectKey) return `project = ${this.config.projectKey} ORDER BY updated DESC`;
    return 'ORDER BY updated DESC';
  }

  async listEntries(): Promise<DocSourceEntry[]> {
    const entries: DocSourceEntry[] = [];
    const jql = encodeURIComponent(this.effectiveJql());
    let startAt = 0;

    for (let page = 0; page < MAX_PAGES_TO_FETCH; page++) {
      const url = this.apiUrl(
        `/rest/api/2/search?jql=${jql}&fields=summary,updated&startAt=${startAt}&maxResults=${PAGE_SIZE}`
      );
      const response = await httpRequest(url, { method: 'GET', headers: this.authHeaders() });
      if (!response.ok) {
        throw new Error(`Jira retornou HTTP ${response.status} ao listar issues de "${this.label}".`);
      }

      const data = JSON.parse(await response.text()) as JiraSearchResponse;
      for (const issue of data.issues || []) {
        const mtime = issue.fields?.updated ? new Date(issue.fields.updated).getTime() : Date.now();
        entries.push({
          id: issue.key,
          title: issue.fields?.summary ? `${issue.key} - ${issue.fields.summary}` : issue.key,
          mtimeMs: Number.isFinite(mtime) ? mtime : Date.now()
        });
      }

      const fetched = (data.issues || []).length;
      startAt += fetched;
      if (fetched < PAGE_SIZE || startAt >= (data.total ?? startAt)) break;
    }

    return entries;
  }

  async readContent(entry: DocSourceEntry): Promise<string> {
    const url = this.apiUrl(`/rest/api/2/issue/${encodeURIComponent(entry.id)}?fields=summary,description,comment`);
    const response = await httpRequest(url, { method: 'GET', headers: this.authHeaders() });
    if (!response.ok) {
      throw new Error(`Jira retornou HTTP ${response.status} ao ler a issue "${entry.title}".`);
    }

    const data = JSON.parse(await response.text()) as JiraIssue;
    const fields = data.fields || {};
    const comments = fields.comment?.comments || [];
    const commentsText = comments
      .map((c) => `\n\n---\n${c.author?.displayName || 'Comentário'}:\n${c.body || ''}`)
      .join('');

    return `# ${entry.title}\n\n${fields.description || ''}${commentsText}`;
  }
}
