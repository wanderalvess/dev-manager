import type { KbDocType, KbIngestItem, KbSource } from './knowledgeBaseTypes';
import { KB_MAX_BATCH } from './knowledgeBaseTypes';

export interface ParsedFrontmatter {
  data: Record<string, string | string[]>;
  body: string;
}

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * Lê um frontmatter YAML simples (chave: valor, listas inline `[a, b]` ou em linhas `- item`).
 * Sem frontmatter devolve o texto original como corpo.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const noBom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const text = noBom.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };

  const data: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of match[1].split('\n')) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      (data[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      data[key] = [];
      listKey = key;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map(unquote)
        .filter(Boolean);
      listKey = null;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return { data, body: text.slice(match[0].length) };
}

export interface DocClassification {
  docType: KbDocType;
  source?: KbSource;
  module?: string;
  category: string;
}

const TDN_DIR = /(^|\/)docs\/Documenta[^/]*TDN\//i;
const CODE_DIR = /(^|\/)docs\/Documenta[^/]*C[^/]*digo\/([^/]+)\//i;

/** Classifica um arquivo do prompt-hub pelo caminho relativo (separador `/`). */
export function classifyDocPath(relPath: string): DocClassification | null {
  const p = relPath.replace(/\\/g, '/');
  if (!/\.(md|txt)$/i.test(p)) return null;

  const code = CODE_DIR.exec(p);
  if (code) return { docType: 'api_doc', source: 'code', module: code[2], category: 'Código' };
  if (TDN_DIR.test(p)) return { docType: 'tdn_page', source: 'tdn', category: 'TDN' };
  if (/(^|\/)skills\//i.test(p)) return { docType: 'skill', category: 'Skills' };
  if (/(^|\/)prompts\//i.test(p)) return { docType: 'prompt', category: 'Prompts' };
  if (/(^|\/)instructions\//i.test(p)) return { docType: 'instruction', category: 'Instruções' };
  return null;
}

/** id estável do upsert: "módulo:arquivo" para código, caminho relativo para os demais. */
export function buildExternalId(relPath: string, classification: DocClassification): string {
  const p = relPath.replace(/\\/g, '/');
  if (classification.module) {
    const file = p.slice(p.indexOf(`/${classification.module}/`) + classification.module.length + 2);
    return `${classification.module}:${file}`;
  }
  return p;
}

export function deriveTitle(body: string, fallbackFileName: string): string {
  const h1 = /^#\s+(.+)$/m.exec(body);
  if (h1) return h1[1].trim();
  return fallbackFileName.replace(/\.(md|txt)$/i, '');
}

function asList(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/** Monta o item de ingestão de um arquivo; `null` se o caminho não é um documento da base. */
export function buildIngestItem(
  relPath: string,
  rawContent: string,
  version?: string
): KbIngestItem | null {
  const classification = classifyDocPath(relPath);
  if (!classification) return null;

  const { data, body } = parseFrontmatter(rawContent);
  const fileName = relPath.replace(/\\/g, '/').split('/').pop() ?? relPath;
  const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : undefined);

  const source = (str('source') as KbSource | undefined) ?? classification.source;
  return {
    docType: (str('docType') as KbDocType | undefined) ?? classification.docType,
    externalId: str('id') ?? buildExternalId(relPath, classification),
    title: str('title') ?? deriveTitle(body, fileName),
    content: body.trim(),
    source,
    sourceUrl: str('sourceUrl'),
    module: str('module') ?? classification.module,
    version: str('version') ?? version,
    category: classification.category,
    tags: asList(data.tags),
    related: asList(data.related),
    visibility: 'shared'
  };
}

export function chunkBatches<T>(items: T[], size: number = KB_MAX_BATCH): T[][] {
  const limit = Math.max(1, Math.min(size, KB_MAX_BATCH));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += limit) out.push(items.slice(i, i + limit));
  return out;
}
