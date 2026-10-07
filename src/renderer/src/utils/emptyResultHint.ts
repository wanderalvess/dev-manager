import type { DatabaseConnectionConfig } from '../../../shared/types';

/** Estado da busca da estimativa de linhas da tabela consultada. */
export type RowEstimateState =
  | { status: 'loading' }
  | { status: 'done'; estimate: number | undefined }
  | { status: 'error' };

/**
 * Texto de apoio do estado vazio de um `SELECT * FROM <tabela>`. `null` enquanto a estimativa carrega
 * (a tela não espera por ela).
 */
export function buildEmptyResultHint(state: RowEstimateState): string | null {
  if (state.status === 'loading') return null;
  if (state.status === 'error' || state.estimate === undefined || !Number.isFinite(state.estimate)) {
    return 'Não foi possível obter a estimativa do catálogo; a tabela parece vazia.';
  }
  if (state.estimate > 0) {
    return `A tabela tem aprox. ${state.estimate.toLocaleString('pt-BR')} linhas (estimativa do catálogo), mas a consulta voltou vazia. Verifique segurança por linha, permissão de leitura ou o WHERE.`;
  }
  return 'A tabela tem aprox. 0 linhas (estimativa do catálogo): ela parece vazia.';
}

/** `database @ host:porta`, para diferenciar conexões com o mesmo nome. */
export function formatConnectionTarget(conn: Pick<DatabaseConnectionConfig, 'database' | 'host' | 'port'>): string {
  const endpoint = conn.port ? `${conn.host}:${conn.port}` : conn.host;
  return conn.database ? `${conn.database} @ ${endpoint}` : endpoint;
}
