import type { DatabaseType, TableColumnInfo } from '../../../shared/types';

export const DEFAULT_PORTS: Record<DatabaseType, number> = {
  oracle: 1521,
  mysql: 3306,
  postgres: 5432
};

export interface ExecutionHistoryItem {
  id: string;
  sql: string;
  connectionName: string;
  timestamp: string;
  success: boolean;
  timeMs: number;
  rowCount?: number;
  affectedRows?: number;
  error?: string;
}

export type ResultTab = 'grid' | 'history' | 'explain' | 'tracer';

export type SortConfig = { column: string; direction: 'asc' | 'desc' } | null;

export interface CellContextMenuState {
  x: number;
  y: number;
  column: string;
  value: any;
  rowIndex: number;
}

export interface EditableTableState {
  name: string;
  columns: TableColumnInfo[];
}
