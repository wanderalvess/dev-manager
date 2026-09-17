import React, { useRef } from 'react';
import {
  Search,
  X,
  Filter,
  FilterX,
  ArrowUp,
  ArrowDown,
  Copy,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { QueryResult } from '../../../../shared/types';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';

export interface ResultsDataGridProps {
  queryResult: QueryResult | null;
  processedRows: any[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  columnFilters: Record<string, string>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  sortConfig: { column: string; direction: 'asc' | 'desc' } | null;
  onToggleSort: (column: string) => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  columnDataTypes: Record<string, 'number' | 'date' | 'boolean' | 'object' | 'string'>;
  selectedRowIndex: number | null;
  setSelectedRowIndex: (idx: number | null) => void;
  activeColumnMenu: string | null;
  setActiveColumnMenu: (col: string | null) => void;
  cellContextMenu: {
    x: number;
    y: number;
    column: string;
    value: any;
    rowIndex: number;
  } | null;
  setCellContextMenu: React.Dispatch<React.SetStateAction<{
    x: number;
    y: number;
    column: string;
    value: any;
    rowIndex: number;
  } | null>>;
  onCopyCell: (text: any, cellKey?: string) => void;
  onFilterByCellValue: (col: string, val: any) => void;
}

export const ResultsDataGrid: React.FC<ResultsDataGridProps> = ({
  queryResult,
  processedRows,
  searchTerm,
  setSearchTerm,
  columnFilters,
  setColumnFilters,
  sortConfig,
  onToggleSort,
  hasActiveFilters,
  onClearAllFilters,
  columnDataTypes,
  selectedRowIndex,
  setSelectedRowIndex,
  activeColumnMenu,
  setActiveColumnMenu,
  cellContextMenu,
  setCellContextMenu,
  onCopyCell,
  onFilterByCellValue
}) => {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Hook de Virtualização de Alta Performance (Windowing a 60 FPS)
  const ROW_HEIGHT = 33;
  const { virtualItems, totalHeight, offsetY, isVirtual } = useVirtualScroll(
    tableContainerRef,
    {
      itemCount: processedRows.length,
      itemHeight: ROW_HEIGHT,
      overscan: 10
    }
  );

  if (!queryResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
        <Terminal className="w-8 h-8 opacity-40" />
        <p>Execute uma consulta ou comando SQL para visualizar os resultados aqui.</p>
        <span className="text-[11px] opacity-60">Dica: use Ctrl+Enter para executar direto do editor.</span>
      </div>
    );
  }

  if (!queryResult.success) {
    return (
      <div className="p-4 m-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
        <div className="flex items-center space-x-2 font-bold mb-1">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Falha na execução do SQL:</span>
        </div>
        <pre className="font-mono text-[11px] whitespace-pre-wrap bg-card p-3 rounded-lg border border-border text-rose-700 dark:text-rose-300 mt-2">
          {queryResult.error}
        </pre>
      </div>
    );
  }

  if (!queryResult.isQuery) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Comando executado com sucesso!</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {queryResult.affectedRows !== undefined
            ? `${queryResult.affectedRows} linha(s) afetada(s) no banco de dados.`
            : 'Comando processado sem retorno de linhas.'}
        </p>
        <span className="text-[11px] font-mono text-muted-foreground mt-2">
          Tempo decorrido: {queryResult.executionTimeMs} ms
        </span>
      </div>
    );
  }

  if (queryResult.rows && queryResult.rows.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
        <Info className="w-6 h-6 opacity-40 mb-1" />
        <p>A consulta não retornou nenhuma linha.</p>
      </div>
    );
  }

  const rowsToRender = isVirtual
    ? virtualItems.map((v) => ({ row: processedRows[v.index], idx: v.index }))
    : processedRows.map((row, idx) => ({ row, idx }));

  const bottomSpacerHeight = Math.max(0, totalHeight - offsetY - (virtualItems.length * ROW_HEIGHT));

  return (
    <div className="flex flex-col h-full">
      {/* Barra de Filtro Rápido Superior (estilo DBeaver) */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border/70 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-xl">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar resultados... (digite qualquer termo para buscar em todas as colunas)"
            className="w-full pl-8 pr-7 py-1 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-sans"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {isVirtual && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Virtual scrolling ativo para rolagem a 60 FPS">
              Virtual 60 FPS
            </span>
          )}
          {hasActiveFilters ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Filter className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>
                  {processedRows.length} de {queryResult.rowCount} linha(s)
                </span>
              </span>
              <button
                type="button"
                onClick={onClearAllFilters}
                className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
                title="Remover todos os filtros e ordenações da tabela"
              >
                <FilterX className="w-3 h-3" />
                <span>Limpar filtros</span>
              </button>
            </>
          ) : (
            <span className="text-muted-foreground text-[11px] font-mono">
              {processedRows.length} linha(s)
            </span>
          )}
        </div>
      </div>

      {/* Tabela de Resultados Virtualizada */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto min-w-full relative">
        <table className="min-w-full divide-y divide-border/60 text-xs font-mono border-separate border-spacing-0">
          <thead className="bg-slate-100 dark:bg-[#181F2E] sticky top-0 z-10 border-b border-border shadow-xs">
            <tr>
              <th className="px-2.5 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase border-b border-r border-border/50 w-12 bg-slate-100 dark:bg-[#181F2E] select-none">
                #
              </th>
              {queryResult.columns.map((col) => {
                const dType = columnDataTypes[col] || 'string';
                const isSorted = sortConfig?.column === col;
                const hasColFilter = Boolean(columnFilters[col]?.trim());
                const isMenuOpen = activeColumnMenu === col;

                return (
                  <th
                    key={col}
                    className="px-2.5 py-1.5 text-left border-b border-r border-border/50 whitespace-nowrap bg-slate-100 dark:bg-[#181F2E] relative select-none group"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div
                        onClick={() => onToggleSort(col)}
                        className="flex items-center space-x-1.5 cursor-pointer hover:text-primary transition flex-1 py-0.5"
                        title={`Clique para ordenar por ${col} (ASC / DESC)`}
                      >
                        {/* Indicador de Tipo de Dado */}
                        {dType === 'number' ? (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                            123
                          </span>
                        ) : dType === 'date' ? (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            📅
                          </span>
                        ) : dType === 'boolean' ? (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            0/1
                          </span>
                        ) : dType === 'object' ? (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                            {'{ }'}
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                            ABC
                          </span>
                        )}

                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                          {col}
                        </span>

                        {isSorted && (
                          sortConfig?.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                          )
                        )}
                      </div>

                      {/* Botão de Menu e Filtro da Coluna */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveColumnMenu(isMenuOpen ? null : col);
                        }}
                        className={`p-1 rounded transition cursor-pointer ${
                          hasColFilter
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/80 opacity-60 group-hover:opacity-100'
                        }`}
                        title={`Filtrar ou ordenar coluna ${col}`}
                      >
                        <Filter className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Menu Popover da Coluna */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={() => setActiveColumnMenu(null)}
                        />
                        <div className="absolute left-0 top-full mt-1 w-64 bg-popover text-popover-foreground rounded-lg shadow-xl border border-border p-2.5 z-30 font-sans text-xs space-y-2">
                          <div className="font-bold text-[11px] text-muted-foreground pb-1 border-b border-border flex items-center justify-between">
                            <span>Opções: {col}</span>
                            <button
                              onClick={() => setActiveColumnMenu(null)}
                              className="hover:text-foreground text-muted-foreground cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                onToggleSort(col);
                                setActiveColumnMenu(null);
                              }}
                              className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-accent transition text-left cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Order by {col} ASC</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onToggleSort(col);
                                setActiveColumnMenu(null);
                              }}
                              className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-accent transition text-left cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Order by {col} DESC</span>
                            </button>
                          </div>

                          <div className="pt-1.5 border-t border-border space-y-1.5">
                            <label className="text-[10px] font-semibold text-muted-foreground block">
                              Filtrar por valor nesta coluna:
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={columnFilters[col] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setColumnFilters((prev) => ({
                                    ...prev,
                                    [col]: val
                                  }));
                                }}
                                placeholder="Ex: texto, [null], !null..."
                                className="w-full px-2 py-1 text-xs bg-background border border-border rounded font-mono"
                                autoFocus
                              />
                              {columnFilters[col] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setColumnFilters((prev) => {
                                      const copy = { ...prev };
                                      delete copy[col];
                                      return copy;
                                    });
                                  }}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-border flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                setColumnFilters((prev) => ({
                                  ...prev,
                                  [col]: '[null]'
                                }));
                                setActiveColumnMenu(null);
                              }}
                              className="text-muted-foreground hover:text-foreground underline text-[10px] cursor-pointer"
                            >
                              Apenas [NULL]
                            </button>

                            {(hasColFilter || isSorted) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setColumnFilters((prev) => {
                                    const copy = { ...prev };
                                    delete copy[col];
                                    return copy;
                                  });
                                  setActiveColumnMenu(null);
                                }}
                                className="text-rose-500 hover:text-rose-600 font-semibold text-[10px] cursor-pointer"
                              >
                                Limpar coluna
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40">
            {processedRows.length === 0 ? (
              <tr className="bg-background">
                <td
                  colSpan={queryResult.columns.length + 1}
                  className="py-12 text-center text-muted-foreground text-xs font-sans"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FilterX className="w-8 h-8 opacity-30 text-amber-500" />
                    <p className="font-semibold text-foreground">Nenhum resultado corresponde aos filtros aplicados.</p>
                    <span className="text-[11px] opacity-70">Tente ajustar o termo de busca ou filtros de coluna.</span>
                    <button
                      type="button"
                      onClick={onClearAllFilters}
                      className="mt-2 px-3 py-1 bg-primary/15 text-primary hover:bg-primary/25 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      Remover todos os filtros
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer Top para Virtualização */}
                {isVirtual && offsetY > 0 && (
                  <tr>
                    <td
                      colSpan={queryResult.columns.length + 1}
                      style={{ height: `${offsetY}px`, padding: 0, border: 'none' }}
                    />
                  </tr>
                )}

                {/* Linhas Visíveis */}
                {rowsToRender.map(({ row, idx }) => {
                  const isSelected = selectedRowIndex === idx;

                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedRowIndex(idx)}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className={`transition-colors select-text cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/15 dark:bg-sky-500/25 border-l-4 border-sky-500 font-medium'
                          : idx % 2 === 0
                          ? 'bg-background hover:bg-muted/30'
                          : 'bg-muted/15 dark:bg-muted/10 hover:bg-muted/30'
                      }`}
                    >
                      <td className="px-2 py-1.5 text-center text-muted-foreground text-[10px] border-r border-border/30 select-none">
                        {idx + 1}
                      </td>
                      {queryResult.columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined;
                        const dType = columnDataTypes[col] || 'string';

                        return (
                          <td
                            key={col}
                            onClick={() => onCopyCell(val, `cell_${idx}_${col}`)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelectedRowIndex(idx);
                              setCellContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                column: col,
                                value: val,
                                rowIndex: idx
                              });
                            }}
                            title="Clique para copiar | Botão direito para filtrar por valor"
                            className="px-3 py-1.5 border-r border-border/30 whitespace-nowrap max-w-xs truncate hover:bg-sky-500/10 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
                          >
                            {isNull ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono select-none bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 italic border border-slate-300/70 dark:border-slate-700/70">
                                [NULL]
                              </span>
                            ) : dType === 'number' || typeof val === 'number' ? (
                              <span className="text-blue-700 dark:text-sky-300 font-mono font-medium">
                                {String(val)}
                              </span>
                            ) : dType === 'date' ? (
                              <span className="text-purple-700 dark:text-purple-300 font-mono font-medium">
                                {String(val)}
                              </span>
                            ) : typeof val === 'boolean' ? (
                              <span className="text-amber-700 dark:text-amber-400 font-mono font-semibold">
                                {String(val)}
                              </span>
                            ) : typeof val === 'object' ? (
                              <span className="text-teal-700 dark:text-teal-300 font-mono text-[11px]">
                                {JSON.stringify(val)}
                              </span>
                            ) : (
                              <span className="text-slate-800 dark:text-slate-100 font-mono">
                                {String(val)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Spacer Bottom para Virtualização */}
                {isVirtual && bottomSpacerHeight > 0 && (
                  <tr>
                    <td
                      colSpan={queryResult.columns.length + 1}
                      style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: 'none' }}
                    />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Menu de Contexto ao Clicar com Botão Direito na Célula */}
      {cellContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setCellContextMenu(null)}
          />
          <div
            style={{
              top: Math.min(cellContextMenu.y, window.innerHeight - 180),
              left: Math.min(cellContextMenu.x, window.innerWidth - 250)
            }}
            className="fixed z-50 w-60 bg-popover text-popover-foreground rounded-lg shadow-2xl border border-border p-1.5 text-xs font-sans animate-fade-in space-y-1"
          >
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground border-b border-border/60">
              Célula: {cellContextMenu.column}
            </div>

            <button
              type="button"
              onClick={() => onFilterByCellValue(cellContextMenu.column, cellContextMenu.value)}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-foreground font-semibold cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">
                Filtrar por "{cellContextMenu.value === null || cellContextMenu.value === undefined ? '[NULL]' : String(cellContextMenu.value)}"
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCopyCell(cellContextMenu.value);
                setCellContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>Copiar valor</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
