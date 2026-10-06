import type { DatabaseConnectionConfig, DbSessionState } from '../../../shared/types';
import type { RiskyStatement } from '../../../shared/sqlStatementUtils';

export type TxMode = 'auto' | 'manual';

const TX_MODE_STORAGE_PREFIX = 'devManager:dbTxMode:';

export function txModeStorageKey(connectionId: string): string {
  return `${TX_MODE_STORAGE_PREFIX}${connectionId}`;
}

export function readStoredTxMode(connectionId: string): TxMode | null {
  try {
    const value = window.localStorage.getItem(txModeStorageKey(connectionId));
    return value === 'auto' || value === 'manual' ? value : null;
  } catch {
    return null;
  }
}

export function storeTxMode(connectionId: string, mode: TxMode): void {
  try {
    window.localStorage.setItem(txModeStorageKey(connectionId), mode);
  } catch {
    // localStorage indisponível: o modo volta ao padrão da conexão na próxima abertura
  }
}

/** Escolha explícita do usuário vence; sem ela, conexão de produção começa em modo manual (como no DBeaver). */
export function resolveInitialTxMode(
  connection: Pick<DatabaseConnectionConfig, 'isProduction'> | null,
  stored: TxMode | null
): TxMode {
  if (stored) return stored;
  return connection?.isProduction ? 'manual' : 'auto';
}

export function describePending(state: Pick<DbSessionState, 'pendingStatements' | 'pendingRows'> | null): string {
  const statements = state?.pendingStatements ?? 0;
  if (statements === 0) return 'Nenhuma alteração pendente';
  const rows = state?.pendingRows ?? 0;
  const label = `${statements} ${statements === 1 ? 'alteração pendente' : 'alterações pendentes'}`;
  return rows > 0 ? `${label} (${rows} ${rows === 1 ? 'linha' : 'linhas'})` : label;
}

/**
 * Mensagem de confirmação antes de executar um comando arriscado, ou null quando não precisa perguntar.
 * UPDATE/DELETE sem WHERE só pergunta em auto-commit (no manual dá para fazer rollback); DROP/TRUNCATE sempre,
 * pois no Oracle e no MySQL fazem commit implícito e não voltam.
 */
export function buildRiskConfirmMessage(risk: RiskyStatement | null, mode: TxMode): string | null {
  if (!risk) return null;
  if (risk.reason === 'no-where') {
    if (mode === 'manual') return null;
    return `${risk.verb} sem WHERE vai afetar TODAS as linhas da tabela e será confirmado na hora (auto-commit).\n\nExecutar mesmo assim?`;
  }
  return `${risk.verb} não pode ser desfeito com rollback.\n\nExecutar mesmo assim?`;
}

/** Texto do aviso ao voltar para auto-commit com alterações pendentes (o banco confirma tudo). */
export function buildSwitchToAutoMessage(state: Pick<DbSessionState, 'pendingStatements' | 'pendingRows'> | null): string | null {
  if (!state || state.pendingStatements === 0) return null;
  return `${describePending(state)}.\n\nVoltar para auto-commit vai CONFIRMAR (commit) essas alterações. Continuar?`;
}
