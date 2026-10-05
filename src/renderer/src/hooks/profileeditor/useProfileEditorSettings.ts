import { useEffect, useState } from 'react';
import type { DatabaseConnectionConfig } from '../../../../shared/types';

/** Carrega conexões de banco e porta de debug global sempre que o modal abre. */
export function useProfileEditorSettings(isOpen: boolean) {
  const [dbConnections, setDbConnections] = useState<DatabaseConnectionConfig[]>([]);
  const [globalDebugPort, setGlobalDebugPort] = useState<number>(5005);

  useEffect(() => {
    if (!isOpen) return;
    if (window.electronAPI && window.electronAPI.getSettings) {
      window.electronAPI
        .getSettings()
        .then((st) => {
          setDbConnections(st.databaseConnections || []);
          if (st.karafDebugPort) {
            setGlobalDebugPort(st.karafDebugPort);
          }
        })
        .catch(() => setDbConnections([]));
    }
  }, [isOpen]);

  return { dbConnections, globalDebugPort };
}
