import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import { isValidSqlIdentifier, isValidSqlTableName } from '../../utils/security';
import { buildEqualityWhereClause, mutationValidationError } from '../../utils/databaseSqlUtils';
import { ROW_ID_COLUMN, isValidRowIdValue, supportsRowId } from '../../../shared/rowIdentity';
import type { DatabaseContext } from './databaseContext';

/** Executa o SQL da mutação. Padrão: conexão compartilhada (auto-commit); com sessão, a da aba do editor. */
export type MutationExecutor = (sql: string, binds: Record<string, any>) => Promise<QueryResult>;

const runMutation = (
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sql: string,
  binds: Record<string, any>,
  exec?: MutationExecutor
): Promise<QueryResult> => (exec ? exec(sql, binds) : ctx.executeQuery(config, sql, 1, binds));

type WhereResult = { clause: string; nextIndex: number } | { error: QueryResult };

/**
 * WHERE de UPDATE/DELETE. Com a chave reservada `__ROWID__` identifica a linha pela pseudo-coluna
 * (Oracle ROWID, PostgreSQL ctid) e rejeita qualquer outra condição junto; senão, igualdade por coluna.
 */
function buildMutationWhere(
  config: DatabaseConnectionConfig,
  where: Record<string, any>,
  binds: Record<string, any>,
  startIndex: number
): WhereResult {
  const keys = Object.keys(where);
  if (!keys.includes(ROW_ID_COLUMN)) {
    for (const col of keys) {
      if (!isValidSqlIdentifier(col)) return { error: mutationValidationError(`Nome de coluna inválido: "${col}".`) };
    }
    return buildEqualityWhereClause(where, binds, startIndex);
  }
  if (keys.length !== 1) {
    return { error: mutationValidationError('Identificação por ROWID/ctid não pode ser combinada com outras colunas.') };
  }
  if (!supportsRowId(config.type)) {
    return { error: mutationValidationError(`O banco ${config.type} não suporta identificação de linha por pseudo-coluna.`) };
  }
  const value = where[ROW_ID_COLUMN];
  if (!isValidRowIdValue(config.type, value)) {
    return { error: mutationValidationError('Identificador de linha (ROWID/ctid) inválido ou ausente.') };
  }
  const key = `p${startIndex}`;
  binds[key] = value;
  return { clause: `${config.type === 'oracle' ? 'ROWID' : 'ctid'} = :${key}`, nextIndex: startIndex + 1 };
}

/**
 * Insere uma linha em `tableName` a partir do editor de dados do DB Studio. Nomes de tabela
 * e coluna vêm da UI (clique numa tabela do schema), por isso são revalidados aqui como
 * identificadores SQL antes de compor o comando — nunca confiar apenas na validação do
 * renderer.
 */
export async function insertRow(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  tableName: string,
  values: Record<string, any>,
  exec?: MutationExecutor
): Promise<QueryResult> {
  if (!isValidSqlTableName(tableName)) {
    return mutationValidationError(`Nome de tabela inválido: "${tableName}".`);
  }
  const columns = Object.keys(values);
  if (columns.length === 0) {
    return mutationValidationError('Informe ao menos uma coluna para inserir a linha.');
  }
  for (const col of columns) {
    if (!isValidSqlIdentifier(col)) {
      return mutationValidationError(`Nome de coluna inválido: "${col}".`);
    }
  }

  const binds: Record<string, any> = {};
  const placeholders = columns.map((col, idx) => {
    binds[`p${idx}`] = values[col];
    return `:p${idx}`;
  });

  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  return runMutation(ctx, config, sql, binds, exec);
}

/**
 * Atualiza colunas de uma única linha em `tableName`, identificada por `where` (chave
 * primária, quando existe; todas as colunas da linha original, como fallback). Bloqueia
 * update sem nenhuma condição — nunca deixa cair num UPDATE de tabela inteira por engano.
 */
export async function updateRow(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  tableName: string,
  changes: Record<string, any>,
  where: Record<string, any>,
  exec?: MutationExecutor
): Promise<QueryResult> {
  if (!isValidSqlTableName(tableName)) {
    return mutationValidationError(`Nome de tabela inválido: "${tableName}".`);
  }
  const setColumns = Object.keys(changes);
  const whereColumns = Object.keys(where);
  if (setColumns.length === 0) {
    return mutationValidationError('Nenhuma alteração informada para atualizar.');
  }
  if (whereColumns.length === 0) {
    return mutationValidationError('Condição WHERE vazia — atualização bloqueada por segurança.');
  }
  for (const col of setColumns) {
    if (!isValidSqlIdentifier(col)) {
      return mutationValidationError(`Nome de coluna inválido: "${col}".`);
    }
  }

  const binds: Record<string, any> = {};
  let idx = 0;
  const setClause = setColumns
    .map((col) => {
      const key = `p${idx++}`;
      binds[key] = changes[col];
      return `${col} = :${key}`;
    })
    .join(', ');
  const built = buildMutationWhere(config, where, binds, idx);
  if ('error' in built) return built.error;

  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${built.clause}`;
  return runMutation(ctx, config, sql, binds, exec);
}

/**
 * Exclui uma única linha de `tableName`, identificada por `where`. Mesma trava de segurança
 * do updateRow: WHERE vazio é rejeitado antes de montar o SQL.
 */
export async function deleteRow(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  tableName: string,
  where: Record<string, any>,
  exec?: MutationExecutor
): Promise<QueryResult> {
  if (!isValidSqlTableName(tableName)) {
    return mutationValidationError(`Nome de tabela inválido: "${tableName}".`);
  }
  const whereColumns = Object.keys(where);
  if (whereColumns.length === 0) {
    return mutationValidationError('Condição WHERE vazia — exclusão bloqueada por segurança.');
  }

  const binds: Record<string, any> = {};
  const built = buildMutationWhere(config, where, binds, 0);
  if ('error' in built) return built.error;

  const sql = `DELETE FROM ${tableName} WHERE ${built.clause}`;
  return runMutation(ctx, config, sql, binds, exec);
}
