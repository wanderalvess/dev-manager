/**
 * Alterações do grid ainda não gravadas no banco. Tudo aqui é puro e imutável: o hook guarda o estado e a tela só
 * desenha. A identidade da linha é a chave primária (ou todas as colunas, sem PK), lida da linha ORIGINAL do resultado,
 * que não muda até o resultado ser recarregado.
 */
export interface PendingUpdate {
  key: string;
  where: Record<string, any>;
  changes: Record<string, any>;
}

export interface PendingDelete {
  key: string;
  where: Record<string, any>;
}

export interface PendingChanges {
  updates: PendingUpdate[];
  deletes: PendingDelete[];
  inserts: Array<Record<string, any>>;
}

export const EMPTY_PENDING: PendingChanges = { updates: [], deletes: [], inserts: [] };

type Row = Record<string, any>;

export function rowKeyOf(row: Row, keyColumns: string[]): string {
  return JSON.stringify(keyColumns.map((c) => row[c] ?? null));
}

function whereOf(row: Row, keyColumns: string[]): Record<string, any> {
  const where: Record<string, any> = {};
  for (const c of keyColumns) where[c] = row[c];
  return where;
}

const sameValue = (a: unknown, b: unknown): boolean => String(a ?? '') === String(b ?? '') && (a === null || a === undefined) === (b === null || b === undefined);

/** Registra a edição de uma célula. Voltar ao valor original remove a alteração; linha marcada para exclusão ignora edições. */
export function stageCellChange(
  pending: PendingChanges,
  row: Row,
  keyColumns: string[],
  column: string,
  newValue: unknown
): PendingChanges {
  const key = rowKeyOf(row, keyColumns);
  if (pending.deletes.some((d) => d.key === key)) return pending;

  const existing = pending.updates.find((u) => u.key === key);
  const changes = { ...(existing?.changes ?? {}) };
  if (sameValue(newValue, row[column])) delete changes[column];
  else changes[column] = newValue;

  const others = pending.updates.filter((u) => u.key !== key);
  const updates = Object.keys(changes).length > 0 ? [...others, { key, where: existing?.where ?? whereOf(row, keyColumns), changes }] : others;
  return { ...pending, updates };
}

/** Marca a linha para exclusão (ou desmarca, se já estava). Descarta edições pendentes dela. */
export function stageDelete(pending: PendingChanges, row: Row, keyColumns: string[]): PendingChanges {
  const key = rowKeyOf(row, keyColumns);
  if (pending.deletes.some((d) => d.key === key)) {
    return { ...pending, deletes: pending.deletes.filter((d) => d.key !== key) };
  }
  return {
    ...pending,
    updates: pending.updates.filter((u) => u.key !== key),
    deletes: [...pending.deletes, { key, where: whereOf(row, keyColumns) }]
  };
}

export function stageInsert(pending: PendingChanges, values: Row): PendingChanges {
  return { ...pending, inserts: [...pending.inserts, values] };
}

export function removeInsert(pending: PendingChanges, index: number): PendingChanges {
  return { ...pending, inserts: pending.inserts.filter((_, i) => i !== index) };
}

/** Quantidade de comandos que "Aplicar" vai executar (uma linha editada = um UPDATE). */
export function pendingCount(pending: PendingChanges): number {
  return pending.updates.length + pending.deletes.length + pending.inserts.length;
}

export function isRowDeleted(pending: PendingChanges, row: Row, keyColumns: string[]): boolean {
  if (pending.deletes.length === 0) return false;
  const key = rowKeyOf(row, keyColumns);
  return pending.deletes.some((d) => d.key === key);
}

/** Valores pendentes da linha (coluna → novo valor), ou undefined se a linha não foi editada. */
export function pendingValuesOf(pending: PendingChanges, row: Row, keyColumns: string[]): Record<string, any> | undefined {
  if (pending.updates.length === 0) return undefined;
  const key = rowKeyOf(row, keyColumns);
  return pending.updates.find((u) => u.key === key)?.changes;
}

export interface PendingExecutor {
  update: (where: Record<string, any>, changes: Record<string, any>) => Promise<{ success: boolean; error?: string; affectedRows?: number }>;
  remove: (where: Record<string, any>) => Promise<{ success: boolean; error?: string; affectedRows?: number }>;
  insert: (values: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
}

export interface ApplyOutcome {
  applied: number;
  remaining: PendingChanges;
  failure?: { description: string; error: string };
}

/**
 * Executa as alterações em ordem (atualizações, exclusões, inserções) e PARA no primeiro erro. O que já foi aplicado
 * sai da lista; o que falhou (e o resto) continua pendente. UPDATE/DELETE que afetaram mais de uma linha são
 * reportados como falha, pois a chave não identificou uma linha só.
 */
export async function applyPendingChanges(pending: PendingChanges, exec: PendingExecutor): Promise<ApplyOutcome> {
  let remaining = pending;
  let applied = 0;

  for (const u of pending.updates) {
    const res = await exec.update(u.where, u.changes);
    if (!res.success) return { applied, remaining, failure: { description: `UPDATE (${Object.keys(u.changes).join(', ')})`, error: res.error ?? 'Falha ao atualizar.' } };
    if ((res.affectedRows ?? 1) > 1) {
      return {
        applied: applied + 1,
        remaining: { ...remaining, updates: remaining.updates.filter((x) => x.key !== u.key) },
        failure: { description: 'UPDATE', error: `A chave da linha afetou ${res.affectedRows} registros (esperado 1). Faça rollback se estiver em modo manual.` }
      };
    }
    remaining = { ...remaining, updates: remaining.updates.filter((x) => x.key !== u.key) };
    applied++;
  }

  for (const d of pending.deletes) {
    const res = await exec.remove(d.where);
    if (!res.success) return { applied, remaining, failure: { description: 'DELETE', error: res.error ?? 'Falha ao excluir.' } };
    if ((res.affectedRows ?? 1) > 1) {
      return {
        applied: applied + 1,
        remaining: { ...remaining, deletes: remaining.deletes.filter((x) => x.key !== d.key) },
        failure: { description: 'DELETE', error: `A chave da linha afetou ${res.affectedRows} registros (esperado 1). Faça rollback se estiver em modo manual.` }
      };
    }
    remaining = { ...remaining, deletes: remaining.deletes.filter((x) => x.key !== d.key) };
    applied++;
  }

  for (const values of pending.inserts) {
    const res = await exec.insert(values);
    if (!res.success) return { applied, remaining, failure: { description: 'INSERT', error: res.error ?? 'Falha ao inserir.' } };
    remaining = { ...remaining, inserts: remaining.inserts.filter((x) => x !== values) };
    applied++;
  }

  return { applied, remaining };
}
