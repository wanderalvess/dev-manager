import { DocSource, DocSourceEntry } from './DocSource';
import { httpRequest } from '../../utils/httpRequest';
import { ConfluenceSourceConfig } from '../../../shared/types';

interface ConfluenceContentPage {
  id: string;
  title: string;
  version?: { when?: string };
}

interface ConfluenceContentResponse {
  results: ConfluenceContentPage[];
  size: number;
  limit: number;
  start: number;
  _links?: { next?: string };
}

const PAGE_SIZE = 50;
/** Limite de segurança para não paginar indefinidamente um espaço absurdamente grande. */
const MAX_PAGES_TO_FETCH = 200;

/**
 * Remove marcação HTML do corpo de uma página Confluence (formato "storage") para texto plano.
 * Não preserva formatação — suficiente para chunking/embedding no RAG, não para exibição.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Fonte de documentação a partir de um espaço do Confluence (Cloud ou Server/Data Center),
 * via REST API v1 (`/wiki/rest/api/content`). Implementa o mesmo contrato `DocSource` usado
 * por `LocalFolderSource`, permitindo que o RAG trate páginas Confluence como mais uma fonte.
 */
export class ConfluenceSource implements DocSource {
  readonly id: string;
  readonly label: string;

  constructor(private readonly config: ConfluenceSourceConfig) {
    this.id = `confluence:${config.baseUrl}:${config.spaceKey || 'all'}`;
    this.label = config.name || config.spaceKey || 'Confluence';
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.config.authEmail) {
      const encoded = Buffer.from(`${this.config.authEmail}:${this.config.authToken}`).toString('base64');
      headers.Authorization = `Basic ${encoded}`;
    } else {
      headers.Authorization = `Bearer ${this.config.authToken}`;
    }
    return headers;
  }

  private apiUrl(pathAndQuery: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const alreadyWiki = /\/wiki$/.test(base);
    return `${base}${alreadyWiki ? '' : '/wiki'}${pathAndQuery}`;
  }

  async listEntries(): Promise<DocSourceEntry[]> {
    const entries: DocSourceEntry[] = [];
    let start = 0;

    for (let page = 0; page < MAX_PAGES_TO_FETCH; page++) {
      const spaceFilter = this.config.spaceKey ? `&spaceKey=${encodeURIComponent(this.config.spaceKey)}` : '';
      const url = this.apiUrl(
        `/rest/api/content?type=page&status=current&expand=version&limit=${PAGE_SIZE}&start=${start}${spaceFilter}`
      );

      const response = await httpRequest(url, { method: 'GET', headers: this.authHeaders() });
      if (!response.ok) {
        throw new Error(`Confluence retornou HTTP ${response.status} ao listar páginas de "${this.label}".`);
      }

      const data = JSON.parse(await response.text()) as ConfluenceContentResponse;
      for (const item of data.results || []) {
        const mtime = item.version?.when ? new Date(item.version.when).getTime() : Date.now();
        entries.push({ id: item.id, title: item.title, mtimeMs: Number.isFinite(mtime) ? mtime : Date.now() });
      }

      if (!data._links?.next || (data.results || []).length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }

    return entries;
  }

  async readContent(entry: DocSourceEntry): Promise<string> {
    const url = this.apiUrl(`/rest/api/content/${encodeURIComponent(entry.id)}?expand=body.storage`);
    const response = await httpRequest(url, { method: 'GET', headers: this.authHeaders() });
    if (!response.ok) {
      throw new Error(`Confluence retornou HTTP ${response.status} ao ler a página "${entry.title}".`);
    }

    const data = JSON.parse(await response.text());
    const html = data?.body?.storage?.value || '';
    return `# ${entry.title}\n\n${htmlToPlainText(html)}`;
  }
}
