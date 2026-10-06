import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DatabaseConnectionConfig, TableColumnInfo } from '../../../../shared/types';

const NO_TABLES: string[] = [];
const NO_COLUMNS: Record<string, TableColumnInfo[]> = {};

/**
 * Tabelas do schema e navegador de colunas, com cache POR CONEXÃO: alternar entre abas de bancos diferentes não
 * recarrega a lista nem mistura colunas de tabelas de mesmo nome em bancos distintos.
 */
export function useDatabaseSchema(activeConnection: DatabaseConnectionConfig | null, activeConnectionId: string) {
  const [tablesByConn, setTablesByConn] = useState<Record<string, string[]>>({});
  const [columnsByConn, setColumnsByConn] = useState<Record<string, Record<string, TableColumnInfo[]>>>({});
  const [tableFilter, setTableFilter] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [isLoadingColumns, setIsLoadingColumns] = useState<Record<string, boolean>>({});

  const tables = tablesByConn[activeConnectionId] ?? NO_TABLES;
  const tableColumns = columnsByConn[activeConnectionId] ?? NO_COLUMNS;

  const setTableColumns = useCallback<React.Dispatch<React.SetStateAction<Record<string, TableColumnInfo[]>>>>(
    (updater) => {
      setColumnsByConn((prev) => {
        const current = prev[activeConnectionId] ?? NO_COLUMNS;
        const next = typeof updater === 'function' ? updater(current) : updater;
        return { ...prev, [activeConnectionId]: next };
      });
    },
    [activeConnectionId]
  );

  // Buscar Tabelas da Conexão Ativa
  const fetchTables = useCallback(async () => {
    if (!activeConnection || !window.electronAPI?.listDbTables) return;
    const key = activeConnection.id;
    setIsLoadingTables(true);
    try {
      const list = await window.electronAPI.listDbTables(activeConnection);
      setTablesByConn((prev) => ({ ...prev, [key]: list || [] }));
    } catch (err) {
      console.error('Erro ao carregar tabelas:', err);
    } finally {
      setIsLoadingTables(false);
    }
  }, [activeConnection]);

  // Trocou de conexão: filtro e tabela expandida são da conexão anterior
  useEffect(() => {
    setTableFilter('');
    setExpandedTable(null);
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
