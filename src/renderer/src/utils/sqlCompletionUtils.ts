import type { TableColumnInfo } from '../../../shared/types';
import type { SqlDialect } from '../../../shared/sqlStatementUtils';
import { findStatementAt } from '../../../shared/sqlSplitUtils';
import { quoteTableName } from '../../../shared/sqlIdentifierUtils';
import { functionsFor, keywordsFor, snippetsFor } from './sqlDictionary';
import { extractReferencedTables, resolveColumnLoadKey, resolveTableKey, type ReferencedTable } from './sqlEditorUtils';

export type CompletionKind = 'keyword' | 'table' | 'column' | 'function' | 'snippet';

export interface CompletionItem {
  label: string;
  kind: CompletionKind;
  /** Texto inserido (pode ter placeholders de snippet). */
  insertText: string;
  isSnippet?: boolean;
  /** Texto curto ao lado do rótulo (tipo da coluna, assinatura da função...). */
  detail?: string;
  /** Ordenação: quanto menor, mais acima. */
  sortText: string;
}

export interface CompletionContext {
  dialect: SqlDialect;
  tables: string[];
  /** Colunas já carregadas da tabela (chave como listada no schema); `undefined` = ainda não carregadas. */
  getColumns: (tableKey: string) => TableColumnInfo[] | undefined;
}

export interface CompletionResult {
  items: CompletionItem[];
  /** Trecho do texto original que a sugestão substitui (a palavra sob o cursor). */
  range: { start: number; end: number };
  /** Tabelas cujas colunas ainda precisam ser carregadas para completar a lista. */
  needColumnsFor: string[];
}

const MAX_ITEMS = 400;
const IDENT_CHAR = /[A-Za-z0-9_$#]/;

const TABLE_CLAUSES = new Set(['FROM', 'JOIN', 'INTO', 'UPDATE', 'TABLE', 'USING']);
const COLUMN_CLAUSES = new Set(['SELECT', 'WHERE', 'AND', 'OR', 'ON', 'SET', 'BY', 'HAVING', 'WHEN', 'THEN', 'ELSE', 'CASE', 'DISTINCT']);
const CLAUSE_REGEX = /\b(SELECT|FROM|JOIN|INTO|UPDATE|TABLE|USING|WHERE|AND|OR|ON|SET|BY|HAVING|WHEN|THEN|ELSE|CASE|DISTINCT|VALUES)\b/gi;

/** Substitui comentários e textos entre aspas por espaços (mesmo tamanho), para procurar palavras-chave sem falso positivo. */
export function maskSqlLiterals(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, (m) => ' '.repeat(m.length))
    .replace(/--[^\r\n]*/g, (m) => ' '.repeat(m.length))
    .replace(/'(?:''|[^'])*'?/g, (m) => ' '.repeat(m.length));
}

/** O cursor está dentro de um texto entre aspas simples ou de um comentário? Nesses casos não se sugere nada. */
export function isInsideStringOrComment(sql: string, offset: number): boolean {
  let i = 0;
  while (i < offset) {
    if (sql.startsWith('--', i)) {
      const eol = sql.indexOf('\n', i);
      if (eol === -1 || eol >= offset) return true;
      i = eol + 1;
    } else if (sql.startsWith('/*', i)) {
      const close = sql.indexOf('*/', i + 2);
      if (close === -1 || close + 2 > offset) return true;
      i = close + 2;
    } else if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j++;
      }
      if (j >= offset) return true;
      i = j + 1;
    } else {
      i++;
    }
  }
  return false;
}

function baseName(table: string): string {
  return table.split('.').pop() || table;
}

function describeColumn(c: TableColumnInfo): string {
  const parts = [c.type];
  if (c.isPrimaryKey) parts.push('PK');
  if (c.nullable === false) parts.push('NOT NULL');
  return parts.filter(Boolean).join(' · ');
}

function matchesPrefix(label: string, prefix: string): boolean {
  if (!prefix) return true;
  const l = label.toLowerCase();
  const p = prefix.toLowerCase();
  return l.startsWith(p) || baseName(l).startsWith(p) || (p.length >= 2 && l.includes(p));
}

/** Filtra pelo prefixo, remove repetidos e ordena: quem COMEÇA com o prefixo vem antes de quem só contém, depois por `sortText`. */
function rankItems(items: CompletionItem[], prefix: string): CompletionItem[] {
  const p = prefix.toLowerCase();
  const startsWith = (i: CompletionItem) => (!p || i.label.toLowerCase().startsWith(p) || baseName(i.label).toLowerCase().startsWith(p) ? 0 : 1);
  return uniqueByKey(items.filter((i) => matchesPrefix(i.label, prefix)), (i) => `${i.kind}|${i.label}`)
    .map((item) => ({ item, rank: startsWith(item) }))
    .sort((a, b) => a.rank - b.rank || (a.item.sortText < b.item.sortText ? -1 : a.item.sortText > b.item.sortText ? 1 : 0))
    .map((x) => x.item)
    .slice(0, MAX_ITEMS);
}

type ClauseGroup = 'table' | 'column' | 'after-table' | 'generic';

/** Decide em que parte do comando o cursor está, olhando a última cláusula antes da palavra atual. */
export function detectClause(maskedBeforeWord: string): ClauseGroup {
  let last: { word: string; end: number } | null = null;
  CLAUSE_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLAUSE_REGEX.exec(maskedBeforeWord)) !== null) {
    last = { word: m[1].toUpperCase(), end: m.index + m[0].length };
  }
  if (!last) return 'generic';
  const between = maskedBeforeWord.slice(last.end).trim();

  if (TABLE_CLAUSES.has(last.word)) {
    // FROM tabela | → já tem tabela: vêm alias e próximas cláusulas, não outra tabela (exceto depois de vírgula)
    if (between && !between.endsWith(',')) return 'after-table';
    return 'table';
  }
  if (COLUMN_CLAUSES.has(last.word)) return 'column';
  return 'generic';
}

function uniqueByKey<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

function columnItems(
  refs: ReferencedTable[],
  ctx: CompletionContext,
  needColumnsFor: string[]
): CompletionItem[] {
  const items: CompletionItem[] = [];
  const multiple = refs.length > 1;

  for (const ref of refs) {
    const key = resolveTableKey(ctx.tables, ref.table);
    const cols = ctx.getColumns(key);
    if (!cols) {
      needColumnsFor.push(resolveColumnLoadKey(ctx.tables, ref.table));
      continue;
    }
    for (const c of cols) {
      items.push({
        label: c.name,
        kind: 'column',
        insertText: c.name,
        detail: `${baseName(ref.table)} · ${describeColumn(c)}`,
        sortText: `0${c.isPrimaryKey ? '0' : '1'}${c.name}`
      });
      if (multiple) {
        items.push({
          label: `${ref.alias}.${c.name}`,
          kind: 'column',
          insertText: `${ref.alias}.${c.name}`,
          detail: describeColumn(c),
          sortText: `1${ref.alias}.${c.name}`
        });
      }
    }
  }
  return items;
}

function tableItems(ctx: CompletionContext, rank: string): CompletionItem[] {
  return ctx.tables.map((t) => ({
    label: t,
    kind: 'table' as const,
    // O rótulo mostra o nome como listado; o texto inserido leva aspas quando o banco exige
    insertText: quoteTableName(t, ctx.dialect),
    detail: 'tabela',
    sortText: `${rank}${t}`
  }));
}

function keywordItems(ctx: CompletionContext, rank: string): CompletionItem[] {
  return keywordsFor(ctx.dialect).map((k) => ({
    label: k,
    kind: 'keyword' as const,
    insertText: k,
    sortText: `${rank}${k}`
  }));
}

function functionItems(ctx: CompletionContext, rank: string): CompletionItem[] {
  return functionsFor(ctx.dialect).map((f) => ({
    label: f.name,
    kind: 'function' as const,
    insertText: f.name,
    detail: f.signature,
    sortText: `${rank}${f.name}`
  }));
}

function snippetItems(ctx: CompletionContext): CompletionItem[] {
  return snippetsFor(ctx.dialect).map((s) => ({
    label: s.trigger,
    kind: 'snippet' as const,
    insertText: s.body,
    isSnippet: true,
    detail: s.title,
    sortText: `5${s.trigger}`
  }));
}

/**
 * Sugestões para a posição do cursor, conscientes do contexto:
 * após `alias.` só as colunas daquela tabela; depois de FROM/JOIN, tabelas; em SELECT/WHERE/ON..., colunas das tabelas
 * do comando (mesmo que o FROM venha depois do cursor), funções e palavras-chave. Pura: quem chama carrega as colunas
 * pendentes (`needColumnsFor`) e pede de novo.
 */
export function computeSqlCompletions(text: string, offset: number, ctx: CompletionContext): CompletionResult {
  const empty: CompletionResult = { items: [], range: { start: offset, end: offset }, needColumnsFor: [] };

  const stmt = findStatementAt(text, offset);
  // Cursor depois de um comando já terminado (nova linha após `;`): é um comando novo, vazio.
  // Comando sem terminador ainda está sendo digitado, mesmo com espaços depois do último texto.
  const inStatement = !!stmt && (offset <= stmt.end || !stmt.terminated);
  const stmtStart = inStatement ? stmt!.start : offset;
  const stmtText = inStatement ? text.slice(stmtStart, Math.max(stmt!.end, offset)) : '';
  const rel = offset - stmtStart;

  if (isInsideStringOrComment(stmtText, rel)) return empty;

  let wordStart = rel;
  while (wordStart > 0 && IDENT_CHAR.test(stmtText[wordStart - 1])) wordStart--;
  const prefix = stmtText.slice(wordStart, rel);
  const range = { start: stmtStart + wordStart, end: offset };

  const masked = maskSqlLiterals(stmtText);
  const refs = uniqueByKey(extractReferencedTables(masked), (r) => `${r.table}|${r.alias}`);
  const needColumnsFor: string[] = [];

  // Qualificado: `qualificador.` + prefixo
  if (wordStart > 0 && stmtText[wordStart - 1] === '.') {
    const m = /([A-Za-z0-9_$#"]+)$/.exec(masked.slice(0, wordStart - 1));
    const qualifier = m ? m[1].replace(/"/g, '') : '';
    if (qualifier) {
      const q = qualifier.toLowerCase();
      const ref = refs.find((r) => r.alias.toLowerCase() === q) ?? refs.find((r) => baseName(r.table).toLowerCase() === q);
      const tableKey = ref
        ? resolveTableKey(ctx.tables, ref.table)
        : ctx.tables.find((t) => t.toLowerCase() === q || baseName(t).toLowerCase() === q);

      if (tableKey) {
        const cols = ctx.getColumns(tableKey);
        if (!cols) {
          needColumnsFor.push(resolveColumnLoadKey(ctx.tables, tableKey));
        }
        const items = (cols ?? [])
          .map<CompletionItem>((c) => ({
            label: c.name,
            kind: 'column',
            insertText: c.name,
            detail: describeColumn(c),
            sortText: `${c.isPrimaryKey ? '0' : '1'}${c.name}`
          }));
        return { items: rankItems(items, prefix), range, needColumnsFor };
      }

      // schema.tabela (PostgreSQL lista como `schema.tabela`)
      const schemaTables = ctx.tables
        .filter((t) => t.toLowerCase().startsWith(`${q}.`))
        .map<CompletionItem>((t) => ({
          label: baseName(t),
          kind: 'table',
          insertText: baseName(t),
          detail: `tabela de ${qualifier}`,
          sortText: `0${t}`
        }));
      return { items: rankItems(schemaTables, prefix), range, needColumnsFor };
    }
  }

  const clause = detectClause(masked.slice(0, wordStart));
  const atStatementStart = masked.slice(0, wordStart).trim() === '';
  let items: CompletionItem[] = [];

  if (clause === 'table') {
    items = [...tableItems(ctx, '0'), ...keywordItems(ctx, '3')];
  } else if (clause === 'column') {
    items = [...columnItems(refs, ctx, needColumnsFor), ...functionItems(ctx, '2'), ...keywordItems(ctx, '3')];
  } else if (clause === 'after-table') {
    items = keywordItems(ctx, '0');
  } else {
    items = [
      ...keywordItems(ctx, '1'),
      ...(atStatementStart ? snippetItems(ctx) : []),
      ...tableItems(ctx, '2'),
      ...functionItems(ctx, '3')
    ];
  }

  // Colunas de comandos como `UPDATE t SET ...` e `INSERT INTO t (` também precisam estar carregadas
  for (const ref of refs) {
    const key = resolveTableKey(ctx.tables, ref.table);
    if (!ctx.getColumns(key)) needColumnsFor.push(resolveColumnLoadKey(ctx.tables, ref.table));
  }

  return {
    items: rankItems(items, prefix),
    range,
    needColumnsFor: [...new Set(needColumnsFor)]
  };
}
