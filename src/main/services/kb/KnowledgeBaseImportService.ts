import fs from 'fs';
import path from 'path';
import { buildIngestItem, chunkBatches } from '../../../shared/knowledgeBaseDocs';
import { applyRelatedMap, parseRelatedMap, RELATED_MAP_FILE } from '../../../shared/knowledgeBaseRelated';
import type { KbIngestItem, KbIngestItemResult } from '../../../shared/knowledgeBaseTypes';
import type { KnowledgeBaseClient } from './KnowledgeBaseClient';

export interface KbImportProgress {
  sent: number;
  total: number;
}

export interface KbImportSummary {
  scanned: number;
  skipped: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  failures: KbIngestItemResult[];
  warnings: string[];
  /** Docs de código ligados a páginas do TDN pelo mapa revisado (docs/related-map.yml). */
  linked: number;
}

const IGNORED_DIRS = new Set(['.git', 'node_modules']);

/** Lista os arquivos .md/.txt de uma pasta, com caminho relativo em `/`. */
export function listDocFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (/\.(md|txt)$/i.test(entry.name)) {
        out.push(path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/'));
      }
    }
  };
  walk(root);
  return out.sort();
}

/** Lê o clone do prompt-hub e envia ao Agile Space em lotes; o servidor decide o que mudou (hash). */
export class KnowledgeBaseImportService {
  constructor(private readonly client: KnowledgeBaseClient) {}

  collect(root: string, version?: string): { items: KbIngestItem[]; skipped: number; linked: number; missing: string[] } {
    if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      throw new Error('Pasta do prompt-hub não encontrada. Configure o caminho nas configurações.');
    }
    const items: KbIngestItem[] = [];
    let skipped = 0;
    for (const rel of listDocFiles(root)) {
      const raw = fs.readFileSync(path.join(root, rel), 'utf-8');
      const item = buildIngestItem(rel, raw, version);
      if (item && item.content) items.push(item);
      else skipped += 1;
    }
    const mapPath = path.join(root, RELATED_MAP_FILE);
    const { linked, missing } = fs.existsSync(mapPath)
      ? applyRelatedMap(items, parseRelatedMap(fs.readFileSync(mapPath, 'utf-8')))
      : { linked: 0, missing: [] };
    return { items, skipped, linked, missing };
  }

  async importFolder(
    root: string,
    options: { version?: string; onProgress?: (p: KbImportProgress) => void } = {}
  ): Promise<KbImportSummary> {
    const { items, skipped, linked, missing } = this.collect(root, options.version);
    const summary: KbImportSummary = {
      scanned: items.length + skipped,
      skipped,
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      failures: [],
      warnings: missing.map((m) => `related-map.yml: página do TDN não encontrada (${m})`),
      linked
    };

    let sent = 0;
    for (const batch of chunkBatches(items)) {
      const res = await this.client.ingest(batch);
      summary.created += res.created;
      summary.updated += res.updated;
      summary.unchanged += res.unchanged;
      summary.errors += res.errors;
      for (const r of res.results) {
        if (r.status === 'error') summary.failures.push(r);
        for (const w of r.warnings ?? []) summary.warnings.push(`${r.externalId}: ${w}`);
      }
      sent += batch.length;
      options.onProgress?.({ sent, total: items.length });
    }
    return summary;
  }
}
