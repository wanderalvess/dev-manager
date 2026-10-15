import React from 'react';
import { ChevronRight, ChevronDown, Info } from 'lucide-react';
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
  onOpenSpec: (tbl: string) => void;
}

export const DatabaseSidebarTableItem: React.FC<DatabaseSidebarTableItemProps> = ({
  tbl,
  isExpanded,
  cols,
  isLoadingCols,
  onToggleTableExpand,
  onTableClick,
  onInsertColumnName,
  onOpenSpec
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
          title={isExpanded ? 'Recolher colunas' : 'Inspecionar colunas'} aria-label={isExpanded ? 'Recolher colunas' : 'Inspecionar colunas'}
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
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSpec(tbl);
          }}
          title={`Descrever ${tbl}: colunas, constraints, índices, triggers e DDL`}
          aria-label={`Descrever ${tbl}`}
          className="p-0.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-primary hover:bg-card transition cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        {cols && (
          <span className="text-2xs px-1 py-0.2 rounded bg-muted/60 text-muted-foreground font-mono">
            {cols.length}
          </span>
        )}
      </div>
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
