import { DocSource, DocSourceEntry } from './DocSource';
import { httpRequest } from '../../utils/httpRequest';
import { ConfluenceSourceConfig } from '../../../shared/types';
import { extractPdfText, extractDocxText } from './textExtractors';

interface ConfluenceContentPage {
  id: string;
  title: string;
  version?: { when?: string };
}

interface ConfluenceAttachment {
  title: string;
  extensions?: { mediaType?: string; fileSize?: number };
  _links?: { download?: string };
}

interface ConfluenceAttachmentResponse {
  results: ConfluenceAttachment[];
}

/** Máximo de anexos processados por página — evita que uma página com dezenas de PDFs trave o reindex. */
const MAX_ATTACHMENTS_PER_PAGE = 10;
/** Anexos maiores que isso são pulados (mesmo teto usado por LocalFolderSource pra binários). */
const MAX_ATTACHMENT_SIZE_BYTES = 20_000_000;

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
    const attachmentsText = await this.fetchAttachmentsText(entry.id);
    return `# ${entry.title}\n\n${htmlToPlainText(html)}${attachmentsText}`;
  }

  /**
   * Baixa e extrai texto de anexos PDF/DOCX da página (imagens e outros formatos são listados
   * pelo nome, mas não têm texto extraído — precisaria de OCR, fora de escopo aqui). Falhas em
   * um anexo individual não derrubam a leitura da página inteira, só pulam aquele anexo.
   */
  private async fetchAttachmentsText(pageId: string): Promise<string> {
    try {
      const url = this.apiUrl(`/rest/api/content/${encodeURIComponent(pageId)}/child/attachment?limit=${MAX_ATTACHMENTS_PER_PAGE}`);
      const response = await httpRequest(url, { method: 'GET', headers: this.authHeaders() });
      if (!response.ok) return '';

      const data = JSON.parse(await response.text()) as ConfluenceAttachmentResponse;
      const attachments = data.results || [];
      if (attachments.length === 0) return '';

      const sections: string[] = [];
      for (const attachment of attachments) {
        const mediaType = attachment.extensions?.mediaType || '';
        const downloadPath = attachment._links?.download;
        const fileSize = attachment.extensions?.fileSize || 0;
        if (!downloadPath || fileSize > MAX_ATTACHMENT_SIZE_BYTES) continue;

        const isPdf = mediaType === 'application/pdf';
        const isDocx = mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!isPdf && !isDocx) continue;

        try {
          const base = this.config.baseUrl.replace(/\/+$/, '');
          const downloadUrl = downloadPath.startsWith('http') ? downloadPath : `${base}${downloadPath}`;
          const fileResponse = await httpRequest(downloadUrl, { method: 'GET', headers: this.authHeaders() });
          if (!fileResponse.ok) continue;

          const buffer = await fileResponse.buffer();
          const text = isPdf ? await extractPdfText(buffer) : await extractDocxText(buffer);
          if (text.trim()) sections.push(`\n\n## Anexo: ${attachment.title}\n${text.trim()}`);
        } catch {
          // Anexo individual falhou (corrompido, protegido por senha, etc.) — segue pros próximos.
        }
      }

      return sections.join('');
    } catch {
      return '';
    }
  }
}
