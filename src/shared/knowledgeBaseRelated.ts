import type { KbIngestItem } from './knowledgeBaseTypes';

/** Nome do mapa revisado que liga docs de código a páginas do TDN (fica em `docs/` do prompt-hub). */
export const RELATED_MAP_FILE = 'docs/related-map.yml';

const CODE_LINE = /^-\s*code:\s*"((?:[^"\\]|\\.)*)"/;
const TDN_LINE = /^\s+-\s*"((?:[^"\\]|\\.)*)"/;

const unescape = (s: string): string => s.replace(/\\(["\\])/g, '$1');

/**
 * Lê o mapa revisado: `- code: "módulo:arquivo.md"` seguido de `tdn:` com uma lista de ids de páginas do TDN
 * (`- "docs/.../pagina.txt"`). Comentários (`#`) e `tdn: []` são ignorados. Devolve código → ids de TDN.
 */
export function parseRelatedMap(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const code = CODE_LINE.exec(line);
    if (code) {
      current = unescape(code[1]);
      if (!map.has(current)) map.set(current, []);
      continue;
    }
    const tdn = current ? TDN_LINE.exec(line) : null;
    if (tdn && current) map.get(current)!.push(unescape(tdn[1]));
  }
  for (const [key, ids] of map) if (ids.length === 0) map.delete(key);
  return map;
}

/**
 * Preenche `related` dos itens de código com as páginas do TDN confirmadas no mapa, sem duplicar o que já veio
 * do frontmatter. Referências a páginas que não existem entre os itens são devolvidas em `missing`.
 */
export function applyRelatedMap(
  items: KbIngestItem[],
  map: Map<string, string[]>
): { linked: number; missing: string[] } {
  const known = new Set(items.filter((i) => i.docType === 'tdn_page').map((i) => i.externalId));
  let linked = 0;
  const missing: string[] = [];
  for (const item of items) {
    const ids = map.get(item.externalId);
    if (!ids || item.docType !== 'api_doc') continue;
    const refs = ids.filter((id) => (known.has(id) ? true : (missing.push(`${item.externalId} → ${id}`), false)));
    if (refs.length === 0) continue;
    item.related = [...new Set([...(item.related ?? []), ...refs.map((id) => `tdn_page:${id}`)])];
    linked += 1;
  }
  return { linked, missing };
}
