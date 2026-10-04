import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DatabaseConnectionConfig, TableColumnInfo } from '../../../../shared/types';

/** Tabelas do schema da conexão ativa e navegador de colunas (com cache por tabela). */
export function useDatabaseSchema(activeConnection: DatabaseConnectionConfig | null, activeConnectionId: string) {
  const [tables, setTables] = useState<string[]>([]);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<Record<string, TableColumnInfo[]>>({});
  const [isLoadingColumns, setIsLoadingColumns] = useState<Record<string, boolean>>({});

  // Buscar Tabelas da Conexão Ativa
  const fetchTables = useCallback(async () => {
    if (!activeConnection || !window.electronAPI?.listDbTables) return;
    setIsLoadingTables(true);
    try {
      const list = await window.electronAPI.listDbTables(activeConnection);
      setTables(list || []);
    } catch (err) {
      console.error('Erro ao carregar tabelas:', err);
    } finally {
      setIsLoadingTables(false);
    }
  }, [activeConnection]);

  // Só reage à troca da seleção (não a cada refresh da lista de conexões)
  useEffect(() => {
    if (activeConnectionId) {
      setTables([]);
    }
  }, [activeConnectionId]);

  const handleToggleTableExpand = async (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedTable === tableName) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(tableName);
    if (!tableColumns[tableName] && activeConnection && window.electronAPI?.getDbTableColumns) {
      setIsLoadingColumns((prev) => ({ ...prev, [tableName]: true }));
      try {
        const cols = await window.electronAPI.getDbTableColumns(activeConnection, tableName);
        setTableColumns((prev) => ({ ...prev, [tableName]: cols || [] }));
      } catch (err) {
        console.error('Erro ao carregar colunas da tabela:', err);
      } finally {
        setIsLoadingColumns((prev) => ({ ...prev, [tableName]: false }));
      }
    }
  };

  const filteredTables = useMemo(() => {
    if (!tableFilter) return tables;
    return tables.filter((t) => t.toLowerCase().includes(tableFilter.toLowerCase()));
  }, [tables, tableFilter]);

  return {
    tables,
    filteredTables,
    tableFilter,
    setTableFilter,
    isLoadingTables,
    expandedTable,
    tableColumns,
    setTableColumns,
    isLoadingColumns,
    setIsLoadingColumns,
    fetchTables,
    handleToggleTableExpand
  };
}
