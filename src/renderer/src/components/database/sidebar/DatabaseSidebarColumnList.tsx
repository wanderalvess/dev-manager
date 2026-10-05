import React from 'react';
import { Key, RotateCw } from 'lucide-react';
import { TableColumnInfo } from '../../../../../shared/types';

interface DatabaseSidebarColumnListProps {
  cols: TableColumnInfo[] | undefined;
  isLoadingCols: boolean | undefined;
  onInsertColumnName: (colName: string) => void;
}

export const DatabaseSidebarColumnList: React.FC<DatabaseSidebarColumnListProps> = ({
  cols,
  isLoadingCols,
  onInsertColumnName
}) => (
  <div className="bg-background/80 border-t border-border/40 p-1 pl-4 space-y-0.5 text-2xs">
    {isLoadingCols ? (
      <div className="py-2 text-center text-muted-foreground flex items-center justify-center gap-1">
        <RotateCw className="w-3 h-3 animate-spin text-primary" /> Carregando colunas...
      </div>
    ) : !cols || cols.length === 0 ? (
      <div className="py-1 text-center text-muted-foreground italic">Nenhuma coluna detectada.</div>
    ) : (
      cols.map((col) => (
        <div
          key={col.name}
          onClick={() => onInsertColumnName(col.name)}
          title={`Clique para inserir '${col.name}' no editor`}
          className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted cursor-pointer group/col transition"
        >
          <div className="flex items-center space-x-1.5 truncate">
            {col.isPrimaryKey && (
              <span title="Chave Primária (PK)" className="flex items-center justify-center shrink-0">
                <Key className="w-2.5 h-2.5 text-amber-400" />
              </span>
            )}
            <span className="font-semibold text-foreground group-hover/col:text-primary truncate">
              {col.name}
            </span>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <span className="text-2xs text-muted-foreground font-mono">{col.type}</span>
            {col.nullable === false && (
              <span className="text-2xs px-1 rounded bg-amber-500/10 text-amber-400 font-bold">
                NOT NULL
              </span>
            )}
          </div>
        </div>
      ))
    )}
  </div>
);
