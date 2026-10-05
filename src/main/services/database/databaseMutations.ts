import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import { isValidSqlIdentifier, isValidSqlTableName } from '../../utils/security';
import { buildEqualityWhereClause, mutationValidationError } from '../../utils/databaseSqlUtils';
import type { DatabaseContext } from './databaseContext';

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
  values: Record<string, any>
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
  return ctx.executeQuery(config, sql, 1, binds);
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
  where: Record<string, any>
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
  for (const col of [...setColumns, ...whereColumns]) {
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
  const { clause: whereClause } = buildEqualityWhereClause(where, binds, idx);

  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
  return ctx.executeQuery(config, sql, 1, binds);
}

/**
 * Exclui uma única linha de `tableName`, identificada por `where`. Mesma trava de segurança
 * do updateRow: WHERE vazio é rejeitado antes de montar o SQL.
 */
export async function deleteRow(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  tableName: string,
  where: Record<string, any>
): Promise<QueryResult> {
  if (!isValidSqlTableName(tableName)) {
    return mutationValidationError(`Nome de tabela inválido: "${tableName}".`);
  }
  const whereColumns = Object.keys(where);
  if (whereColumns.length === 0) {
    return mutationValidationError('Condição WHERE vazia — exclusão bloqueada por segurança.');
  }
  for (const col of whereColumns) {
    if (!isValidSqlIdentifier(col)) {
      return mutationValidationError(`Nome de coluna inválido: "${col}".`);
    }
  }

  const binds: Record<string, any> = {};
  const { clause: whereClause } = buildEqualityWhereClause(where, binds, 0);

  const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
  return ctx.executeQuery(config, sql, 1, binds);
}
