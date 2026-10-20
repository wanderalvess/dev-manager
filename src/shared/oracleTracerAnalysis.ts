/**
 * Análise do que o Statement Tracer capturou, agrupada por rotina/tela. Funções puras (sem Node nem Electron):
 * o renderer e o MCP usam o mesmo cálculo sobre o mesmo conjunto de `OracleRecentStatement`.
 */

/** Métricas acumuladas de uma instrução no cursor cache (v$sql); todas desde o carregamento do cursor. */
export interface OracleStatementMetrics {
  /** ELAPSED_TIME total, em ms. */
  elapsedMs?: number | null;
  cpuMs?: number | null;
  bufferGets?: number | null;
  diskReads?: number | null;
  rowsProcessed?: number | null;
}

interface AnalyzableStatement extends OracleStatementMetrics {
  sqlId: string;
  sqlText: string;
  module: string | null;
  action: string | null;
  executions: number | null;
}

/** Mesma consulta executada tantas vezes (laço no cliente) já merece atenção. */
export const DEFAULT_MANY_EXECUTIONS = 50;
/** Muitas variações só pelo valor literal = SQL montado por concatenação, um parse a cada chamada. */
export const DEFAULT_LITERAL_VARIANTS = 5;
const SQL_PREVIEW_CHARS = 300;
const NO_MODULE_LABEL = '(sem módulo)';

export interface TracerSlowStatement {
  sqlId: string;
  sqlPreview: string;
  executions: number;
  totalElapsedMs: number;
  avgElapsedMs: number;
  bufferGetsPerExec: number | null;
}

export type TracerRepeatKind = 'many-executions' | 'literal-variants';

export interface TracerRepeatedPattern {
  kind: TracerRepeatKind;
  /** SQL sem literais, comum a todas as variações. */
  normalizedSql: string;
  sqlIds: string[];
  totalExecutions: number;
  totalElapsedMs: number;
}

export interface TracerScreenSummary {
  action: string;
  statementCount: number;
  totalExecutions: number;
}

export interface TracerRoutineGroup {
  key: string;
  /** Nome do módulo sem caminho nem extensão (ex.: PCSIS2075). */
  label: string;
  /** Número da rotina WinThor, quando o módulo o traz (ex.: 2075). */
  routineCode: string | null;
  /** Cliente que parece ser um executável (Delphi etc.) e não um driver JDBC ou serviço. */
  isExecutable: boolean;
  statementCount: number;
  totalExecutions: number;
  totalElapsedMs: number;
  screens: TracerScreenSummary[];
  slowest: TracerSlowStatement[];
  repeated: TracerRepeatedPattern[];
}

export interface TracerAnalysisOptions {
  manyExecutions?: number;
  literalVariants?: number;
  topSlow?: number;
}

/** Tira literais e listas IN para que consultas iguais com valores diferentes caiam no mesmo balde. */
export function normalizeSql(sqlText: string): string {
  return sqlText
    .replace(/'(?:[^']|'')*'/g, '?')
    .replace(/(?<![:\w])\d+(?:\.\d+)?\b/g, '?')
    .replace(/\(\s*\?(?:\s*,\s*\?)+\s*\)/g, '(?)')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** `C:\Prod\PCSIS2075.exe` → `PCSIS2075`; módulos sem caminho (ex.: `JDBC Thin Client`) ficam como estão. */
export function moduleLabel(module: string | null | undefined): string {
  const raw = (module || '').trim();
  if (!raw) return NO_MODULE_LABEL;
  const base = raw.split(/[\\/]/).pop() || raw;
  return base.replace(/\.exe$/i, '').trim() || NO_MODULE_LABEL;
}

export function routineCodeOf(label: string): string | null {
  return /(\d{3,4})/.exec(label)?.[1] ?? null;
}

function isExecutableModule(module: string | null | undefined): boolean {
  return /\.exe$/i.test((module || '').trim());
}

function preview(sqlText: string): string {
  const flat = sqlText.replace(/\s+/g, ' ').trim();
  return flat.length > SQL_PREVIEW_CHARS ? `${flat.slice(0, SQL_PREVIEW_CHARS)}…` : flat;
}

export function findSlowStatements(statements: AnalyzableStatement[], top: number): TracerSlowStatement[] {
  return statements
    .filter((s) => (s.executions ?? 0) > 0 && typeof s.elapsedMs === 'number')
    .map((s) => {
      const executions = s.executions as number;
      const total = s.elapsedMs as number;
      return {
        sqlId: s.sqlId,
        sqlPreview: preview(s.sqlText),
        executions,
        totalElapsedMs: total,
        avgElapsedMs: total / executions,
        bufferGetsPerExec: typeof s.bufferGets === 'number' ? s.bufferGets / executions : null
      };
    })
    .sort((a, b) => b.avgElapsedMs - a.avgElapsedMs)
    .slice(0, top);
}

export function findRepeatedPatterns(
  statements: AnalyzableStatement[],
  manyExecutions = DEFAULT_MANY_EXECUTIONS,
  literalVariants = DEFAULT_LITERAL_VARIANTS
): TracerRepeatedPattern[] {
  const buckets = new Map<string, AnalyzableStatement[]>();
  for (const s of statements) {
    const key = normalizeSql(s.sqlText);
    if (!key) continue;
    buckets.set(key, [...(buckets.get(key) ?? []), s]);
  }
  const found: TracerRepeatedPattern[] = [];
  for (const [normalizedSql, bucket] of buckets) {
    const totalExecutions = bucket.reduce((sum, s) => sum + (s.executions ?? 0), 0);
    const kind: TracerRepeatKind | null =
      bucket.length >= literalVariants
        ? 'literal-variants'
        : bucket.some((s) => (s.executions ?? 0) >= manyExecutions)
          ? 'many-executions'
          : null;
    if (!kind) continue;
    found.push({
      kind,
      normalizedSql: preview(normalizedSql),
      sqlIds: bucket.map((s) => s.sqlId),
      totalExecutions,
      totalElapsedMs: bucket.reduce((sum, s) => sum + (s.elapsedMs ?? 0), 0)
    });
  }
  return found.sort((a, b) => b.totalExecutions - a.totalExecutions);
}

function summarizeScreens(statements: AnalyzableStatement[]): TracerScreenSummary[] {
  const byAction = new Map<string, TracerScreenSummary>();
  for (const s of statements) {
    const action = (s.action || '').trim();
    if (!action) continue;
    const current = byAction.get(action) ?? { action, statementCount: 0, totalExecutions: 0 };
    current.statementCount += 1;
    current.totalExecutions += s.executions ?? 0;
    byAction.set(action, current);
  }
  return [...byAction.values()].sort((a, b) => b.totalExecutions - a.totalExecutions);
}

/** Agrupa por módulo (rotina) e, dentro de cada um, destaca as consultas mais lentas e as repetidas. */
export function analyzeTracerCapture(
  statements: AnalyzableStatement[],
  options: TracerAnalysisOptions = {}
): TracerRoutineGroup[] {
  const topSlow = options.topSlow ?? 5;
  const groups = new Map<string, AnalyzableStatement[]>();
  for (const s of statements) {
    const label = moduleLabel(s.module);
    groups.set(label, [...(groups.get(label) ?? []), s]);
  }
  const result: TracerRoutineGroup[] = [];
  for (const [label, members] of groups) {
    result.push({
      key: label,
      label,
      routineCode: routineCodeOf(label),
      isExecutable: members.some((s) => isExecutableModule(s.module)),
      statementCount: members.length,
      totalExecutions: members.reduce((sum, s) => sum + (s.executions ?? 0), 0),
      totalElapsedMs: members.reduce((sum, s) => sum + (s.elapsedMs ?? 0), 0),
      screens: summarizeScreens(members),
      slowest: findSlowStatements(members, topSlow),
      repeated: findRepeatedPatterns(members, options.manyExecutions, options.literalVariants)
    });
  }
  return result.sort((a, b) => b.totalElapsedMs - a.totalElapsedMs || b.totalExecutions - a.totalExecutions);
}
