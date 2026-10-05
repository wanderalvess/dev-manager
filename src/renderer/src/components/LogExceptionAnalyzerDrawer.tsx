import React, { useState, useMemo } from 'react';
import {
  Bug,
  Check,
  ChevronRight,
  Copy,
  Search,
  Terminal,
  X,
  Zap
} from 'lucide-react';
import { LogAnalysisSummary, LogExceptionType } from '../../../shared/types';
import { analyzeLogText } from '../utils/logAnalyzerUtils';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface LogExceptionAnalyzerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lines: string[];
  onScrollToLine?: (lineIndex: number) => void;
}

export const LogExceptionAnalyzerDrawer: React.FC<LogExceptionAnalyzerDrawerProps> = ({
  isOpen,
  onClose,
  lines,
  onScrollToLine
}) => {
  const [filterType, setFilterType] = useState<LogExceptionType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard(2000);

  // Analisa as linhas de log em memória de forma contínua e memoizada
  const summary: LogAnalysisSummary = useMemo(() => {
    return analyzeLogText(lines);
  }, [lines]);

  // Filtra as ocorrências
  const filteredMatches = useMemo(() => {
    return summary.matches.filter((m) => {
      const matchType = filterType === 'ALL' || m.type === filterType;
      if (!matchType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (m.code && m.code.toLowerCase().includes(q)) ||
        m.title.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q) ||
        m.explanation.toLowerCase().includes(q)
      );
    });
  }, [summary, filterType, searchQuery]);

  if (!isOpen) return null;

  const getTypeBadge = (type: LogExceptionType) => {
    switch (type) {
      case 'ORA':
        return { label: 'Oracle SQL', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/40' };
      case 'OOM':
        return { label: 'JVM Memória', bg: 'bg-red-500/20 text-red-400 border-red-500/40' };
      case 'NPE':
        return { label: 'NullPointer', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/40' };
      case 'BUNDLE':
        return { label: 'OSGi Bundle', bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40' };
      case 'CLASS_NOT_FOUND':
        return { label: 'Classe Ausente', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/40' };
      case 'LINK_COMM':
        return { label: 'Rede / Link', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40' };
      default:
        return { label: 'Exceção', bg: 'bg-muted text-muted-foreground border-border' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header do Drawer */}
        <div className="p-3.5 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <Bug className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono tracking-tight uppercase text-foreground">
                  Diagnóstico de Exceções & Logs
                </h3>
                <span className="text-2xs font-mono px-2 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold tabular-nums">
                  {summary.totalErrors} DETECTADAS
                </span>
              </div>
              <p className="text-2xs text-muted-foreground font-mono mt-0.5">
                Classificação automática de falhas WinThor, Oracle ORA, JVM e OSGi.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
            title="Fechar painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Controls de Contagem por Categoria */}
        <div className="p-2.5 bg-muted/10 border-b border-border/60 flex flex-wrap gap-1 shrink-0 text-xs font-mono">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-card text-foreground border border-border shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            TODOS ({summary.totalErrors})
          </button>

          {summary.oraErrorsCount > 0 && (
            <button
              onClick={() => setFilterType('ORA')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                filterType === 'ORA'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-2xs'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              ORACLE ({summary.oraErrorsCount})
            </button>
          )}

          {summary.oomCount > 0 && (
            <button
              onClick={() => setFilterType('OOM')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                filterType === 'OOM'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-2xs'
                  : 'text-red-400 hover:text-red-300'
              }`}
            >
              MEMÓRIA OOM ({summary.oomCount})
            </button>
          )}

          {summary.npeCount > 0 && (
            <button
              onClick={() => setFilterType('NPE')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                filterType === 'NPE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-2xs'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              NULLPOINTER ({summary.npeCount})
            </button>
          )}

          {summary.bundleErrorsCount > 0 && (
            <button
              onClick={() => setFilterType('BUNDLE')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                filterType === 'BUNDLE'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-2xs'
                  : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              OSGi BUNDLE ({summary.bundleErrorsCount})
            </button>
          )}
        </div>

        {/* Busca */}
        <div className="p-2.5 border-b border-border/60 bg-background shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por código (ex: ORA-00942), texto ou diagnóstico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/20 border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>
        </div>

        {/* Lista de Erros Encontrados */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {filteredMatches.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs font-mono">
              <Zap className="w-7 h-7 mb-2 text-emerald-500 opacity-80" />
              <span className="font-bold text-foreground">Nenhuma anomalia crítica detectada</span>
              <span className="text-[11px] text-muted-foreground/80 mt-1 max-w-xs">
                As linhas analisadas não contêm padrões conhecidos de ORA, NullPointer, BundleException ou OutOfMemory.
              </span>
            </div>
          ) : (
            filteredMatches.map((err) => {
              const badge = getTypeBadge(err.type);

              return (
                <div
                  key={err.id}
                  className="p-3 bg-background border border-border rounded-lg space-y-2 hover:border-border/90 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-2xs font-bold font-mono px-1.5 py-0.2 rounded border uppercase ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold text-foreground font-mono">{err.code}</span>
                    </div>

                    {onScrollToLine && (
                      <button
                        onClick={() => {
                          onScrollToLine(err.lineIndex);
                          onClose();
                        }}
                        className="text-2xs text-primary hover:underline flex items-center space-x-0.5 cursor-pointer font-mono"
                        title="Ir para esta linha no console de log"
                      >
                        <span>L:{err.lineIndex + 1}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground font-mono">{err.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-sans">{err.explanation}</p>
                  </div>

                  {/* Linha Bruta de Log */}
                  <div className="p-2 bg-muted/30 rounded text-2xs font-mono text-muted-foreground break-all border border-border/40 select-all">
                    {err.rawLine}
                  </div>

                  {/* Comandos Sugeridos */}
                  {err.suggestedCommands && err.suggestedCommands.length > 0 && (
                    <div className="pt-1.5 border-t border-border/40 space-y-1">
                      <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-primary" /> Diagnóstico sugerido:
                      </span>
                      {err.suggestedCommands.map((cmd, cIdx) => {
                        const isCopied = copyFeedback === `${err.id}_${cIdx}`;
                        return (
                          <div
                            key={cIdx}
                            className="flex items-center justify-between p-1.5 bg-muted/20 border border-border/40 rounded text-2xs font-mono group"
                          >
                            <span className="text-foreground/90 select-all truncate pr-2">
                              <span className="text-muted-foreground mr-1.5 select-none">$</span>
                              {cmd}
                            </span>
                            <button
                              onClick={() => copyToClipboard(cmd, `${err.id}_${cIdx}`)}
                              className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                              title="Copiar comando"
                            >
                              {isCopied ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer do Drawer */}
        <div className="p-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs font-mono text-muted-foreground shrink-0">
          <span>EXIBINDO: {filteredMatches.length} / {summary.totalErrors}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
