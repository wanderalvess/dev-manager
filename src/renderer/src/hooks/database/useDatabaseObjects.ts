import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DatabaseConnectionConfig, DbObjectInfo, DbObjectType } from '../../../../shared/types';

export type ExplorerObjectType = Extract<
  DbObjectType,
  'TABLE' | 'VIEW' | 'MATERIALIZED VIEW' | 'PROCEDURE' | 'FUNCTION' | 'PACKAGE' | 'SEQUENCE' | 'TRIGGER' | 'SYNONYM' | 'TYPE'
>;

export const EXPLORER_TYPE_OPTIONS: Array<{ type: ExplorerObjectType; label: string }> = [
  { type: 'TABLE', label: 'Tabelas' },
  { type: 'VIEW', label: 'Views' },
  { type: 'MATERIALIZED VIEW', label: 'Views materializadas' },
  { type: 'PROCEDURE', label: 'Procedures' },
  { type: 'FUNCTION', label: 'Functions' },
  { type: 'PACKAGE', label: 'Packages' },
  { type: 'SEQUENCE', label: 'Sequences' },
  { type: 'TRIGGER', label: 'Triggers' },
  { type: 'SYNONYM', label: 'Sinônimos' },
  { type: 'TYPE', label: 'Types' }
];

/** Objetos do schema além de tabelas (views, procedures, packages...), carregados sob demanda para a árvore da sidebar. */
export function useDatabaseObjects(
  activeConnection: DatabaseConnectionConfig | null,
  activeConnectionId: string,
  nameFilter: string
) {
  const [objects, setObjects] = useState<DbObjectInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [objectType, setObjectType] = useState<ExplorerObjectType>('TABLE');

  const fetchObjects = useCallback(async () => {
    if (!activeConnection || !window.electronAPI?.listDbObjects) return;
    setIsLoadingObjects(true);
    try {
      setObjects((await window.electronAPI.listDbObjects(activeConnection)) ?? []);
      setLoaded(true);
    } catch (err) {
      console.error('Erro ao carregar objetos do schema:', err);
    } finally {
      setIsLoadingObjects(false);
    }
  }, [activeConnection]);

  // Trocou de conexão: a lista e o tipo escolhido deixam de valer
  useEffect(() => {
    setObjects([]);
    setLoaded(false);
    setObjectType('TABLE');
  }, [activeConnectionId]);

  // Só busca quando o usuário olha para um tipo que não é tabela
  useEffect(() => {
    if (objectType !== 'TABLE' && !loaded && !isLoadingObjects && activeConnection) {
      void fetchObjects();
    }
  }, [objectType, loaded, isLoadingObjects, activeConnection, fetchObjects]);

  const counts = useMemo(() => {
    const result: Partial<Record<DbObjectType, number>> = {};
    for (const o of objects) result[o.type] = (result[o.type] ?? 0) + 1;
    return result;
  }, [objects]);

  const objectsOfType = useMemo(() => {
    const term = nameFilter.trim().toLowerCase();
    return objects.filter((o) => o.type === objectType && (!term || o.name.toLowerCase().includes(term)));
  }, [objects, objectType, nameFilter]);

  return { objectType, setObjectType, objectsOfType, counts, isLoadingObjects, loaded, fetchObjects };
}
