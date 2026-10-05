import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TableColumnInfo } from '../../../../../shared/types';
import { DatabaseSidebarColumnList } from './DatabaseSidebarColumnList';

interface DatabaseSidebarTableItemProps {
  tbl: string;
  isExpanded: boolean;
  cols: TableColumnInfo[] | undefined;
  isLoadingCols: boolean | undefined;
  onToggleTableExpand: (tbl: string, e: React.MouseEvent) => void;
  onTableClick: (tbl: string) => void;
  onInsertColumnName: (colName: string) => void;
}

export const DatabaseSidebarTableItem: React.FC<DatabaseSidebarTableItemProps> = ({
  tbl,
  isExpanded,
  cols,
  isLoadingCols,
  onToggleTableExpand,
  onTableClick,
  onInsertColumnName
}) => (
  <div className="rounded-lg border border-transparent hover:border-border/40 transition overflow-hidden">
    <div
      onClick={() => onTableClick(tbl)}
      title={`Inserir query SELECT para ${tbl}`}
      className={`w-full text-left px-2 py-1.5 rounded text-muted-foreground hover:text-foreground flex items-center justify-between group cursor-pointer transition ${
        isExpanded ? 'bg-muted/70 text-foreground font-bold' : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center space-x-1 min-w-0 truncate">
        <button
          type="button"
          onClick={(e) => onToggleTableExpand(tbl, e)}
          title={isExpanded ? 'Recolher colunas' : 'Inspecionar colunas'}
          className="p-0.5 rounded hover:bg-card text-muted-foreground hover:text-primary transition shrink-0 cursor-pointer"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 group-hover:text-primary" />
          )}
        </button>
        <span className="truncate">{tbl}</span>
      </div>
      {cols && (
        <span className="text-[9px] px-1 py-0.2 rounded bg-muted/60 text-muted-foreground shrink-0 font-mono">
          {cols.length}
        </span>
      )}
    </div>

    {/* Lista de colunas expandida */}
    {isExpanded && (
      <DatabaseSidebarColumnList
        cols={cols}
        isLoadingCols={isLoadingCols}
        onInsertColumnName={onInsertColumnName}
      />
    )}
  </div>
);
