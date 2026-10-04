export type CalloutType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

export interface MarkdownListItem {
  text: string;
  isTask: boolean;
  checked?: boolean;
  isOrdered: boolean;
}

// `key` reproduz a chave React original (tipo + índice de linha) para manter a identidade dos nós.
export type MarkdownBlock =
  | { kind: 'code'; key: string; language: string; lineCount: number; code: string; codeIndex: number }
  | { kind: 'callout'; key: string; type: CalloutType; lines: string[] }
  | { kind: 'quote'; key: string; lines: string[]; isPrompt: boolean }
  | { kind: 'heading'; key: string; level: number; text: string; id: string; isFirst: boolean }
  | { kind: 'hr'; key: string }
  | { kind: 'table'; key: string; header: string[]; rows: string[][] }
  | { kind: 'list'; key: string; items: MarkdownListItem[] }
  | { kind: 'paragraph'; key: string; text: string };

const LIST_ITEM_RE = /^[-*+]\s+/;
const ORDERED_ITEM_RE = /^\d+\.\s+/;

const splitTableRow = (row: string): string[] =>
  row
    .trim()
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());

/** Converte o texto Markdown em uma lista plana de blocos, sem nenhuma dependência de React. */
export const parseMarkdownBlocks = (content: string): MarkdownBlock[] => {
  if (!content) return [];

  const lines = content.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;
  let codeBlockCount = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Bloco de código cercado
    if (trimmed.startsWith('```')) {
      const langMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)/);
      const language = langMatch && langMatch[1] ? langMatch[1].toLowerCase() : 'code';
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consome o fechamento ```

      const codeIndex = codeBlockCount++;
      blocks.push({
        kind: 'code',
        key: `code-${codeIndex}`,
        language,
        lineCount: codeLines.length,
        code: codeLines.join('\n'),
        codeIndex
      });
      continue;
    }

    // 2. Callouts estilo GitHub Alerts
    const alertMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if (alertMatch) {
      const type = alertMatch[1].toUpperCase() as CalloutType;
      const alertLines: string[] = [];
      if (alertMatch[2]) alertLines.push(alertMatch[2]);
      i++;

      while (i < lines.length && lines[i].trim().startsWith('>')) {
        alertLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'callout', key: `callout-${i}`, type, lines: alertLines });
      continue;
    }

    // 3. Blockquote comum
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const isPrompt = quoteLines.some((ql) => ql.trim().startsWith('"'));
      blocks.push({ kind: 'quote', key: `quote-${i}`, lines: quoteLines, isPrompt });
      continue;
    }

    // 4. Títulos
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      blocks.push({
        kind: 'heading',
        key: `h${level}-${i}`,
        level,
        text,
        id: `heading-${i}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        isFirst: blocks.length === 0
      });
      i++;
      continue;
    }

    // 5. Linha divisória
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ kind: 'hr', key: `hr-${i}` });
      i++;
      continue;
    }

    // 6. Tabelas
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const header = splitTableRow(trimmed);
      i += 2; // pula o header e o divisor |---|---|

      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', key: `table-${i}`, header, rows });
      continue;
    }

    // 7. Listas (ordenadas, não ordenadas e checklists)
    if (LIST_ITEM_RE.test(trimmed) || ORDERED_ITEM_RE.test(trimmed)) {
      const items: MarkdownListItem[] = [];

      while (i < lines.length && (LIST_ITEM_RE.test(lines[i].trim()) || ORDERED_ITEM_RE.test(lines[i].trim()))) {
        const curTrim = lines[i].trim();
        const isOrdered = ORDERED_ITEM_RE.test(curTrim);
        const itemText = curTrim.replace(LIST_ITEM_RE, '').replace(ORDERED_ITEM_RE, '');

        const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          items.push({ text: taskMatch[2], isTask: true, checked: taskMatch[1].toLowerCase() === 'x', isOrdered });
        } else {
          items.push({ text: itemText, isTask: false, isOrdered });
        }
        i++;
      }
      blocks.push({ kind: 'list', key: `list-${i}`, items });
      continue;
    }

    // 8. Parágrafo
    blocks.push({ kind: 'paragraph', key: `p-${i}`, text: line });
    i++;
  }

  return blocks;
};
