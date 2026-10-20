import React, { useEffect, useRef, useState } from 'react';
import { FilterX } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import { buildEmptyResultHint, type RowEstimateState } from '../../../utils/emptyResultHint';

interface EmptyResultNoticeProps {
  /** Tabela do `SELECT * FROM <tabela>` que voltou vazio; ausente quando a consulta é outra. */
  tableName: string | null;
  connection: DatabaseConnectionConfig | null;
}

/** Estado vazio de uma consulta que rodou e não devolveu linhas; consulta a estimativa do catálogo sob demanda, sem bloquear. */
export const EmptyResultNotice: React.FC<EmptyResultNoticeProps> = ({ tableName, connection }) => {
  const [estimate, setEstimate] = useState<RowEstimateState>({ status: 'loading' });
  const canEstimate = Boolean(tableName && connection && window.electronAPI?.getDbTableDetails);
  // A conexão é lida via ref: depender do objeto refaria a consulta a cada render do pai.
  const connectionRef = useRef(connection);
  connectionRef.current = connection;
  const connectionId = connection?.id;

  useEffect(() => {
    const conn = connectionRef.current;
    if (!canEstimate || !tableName || !conn) return;
    let cancelled = false;
    setEstimate({ status: 'loading' });
    window
      .electronAPI!.getDbTableDetails(conn, tableName)
      .then((d) => !cancelled && setEstimate(d.success ? { status: 'done', estimate: d.rowCountEstimate } : { status: 'error' }))
      .catch(() => !cancelled && setEstimate({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [canEstimate, tableName, connectionId]);

  const hint = canEstimate ? buildEmptyResultHint(estimate) : null;

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <FilterX className="w-8 h-8 opacity-30 text-info" />
      <p className="font-semibold text-foreground">A consulta foi executada, mas não retornou nenhuma linha.</p>
      <span className="text-2xs opacity-70 max-w-md">
        A tabela pode estar vazia, o WHERE pode não ter correspondência, ou o usuário da conexão pode não ter
        permissão de leitura nas linhas (por exemplo, políticas de segurança por linha).
      </span>
      {hint && (
        <span className="text-2xs text-info max-w-md" data-testid="empty-result-hint">
          {hint}
        </span>
      )}
    </div>
  );
};
