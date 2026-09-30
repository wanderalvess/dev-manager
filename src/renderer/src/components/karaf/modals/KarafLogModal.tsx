import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Terminal, X, Search, RotateCw } from 'lucide-react';

interface KarafLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KarafLogModal: React.FC<KarafLogModalProps> = ({
  isOpen,
  onClose
}) => {
  const [karafLog, setKarafLog] = useState('');
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [logLines, setLogLines] = useState(200);
  const [logSearch, setLogSearch] = useState('');

  const handleRefreshLog = useCallback(async () => {
    if (!window.electronAPI?.getKarafLog) return;
    setIsLoadingLog(true);
    try {
      const res = await window.electronAPI.getKarafLog(logLines);
      setKarafLog(res?.output || '');
    } catch (err: any) {
      setKarafLog(`[ERRO] Falha ao ler log do Karaf: ${err?.message || err}`);
    } finally {
      setIsLoadingLog(false);
    }
  }, [logLines]);

  useEffect(() => {
    if (isOpen) {
      handleRefreshLog();
    }
  }, [isOpen, handleRefreshLog]);

  const filteredKarafLog = useMemo(() => {
    if (!logSearch.trim()) return karafLog;
    const needle = logSearch.trim().toLowerCase();
    return karafLog
      .split(/\r?\n/)
      .filter((line) => line.toLowerCase().includes(needle))
      .join('\n');
  }, [karafLog, logSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card dark:bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl h-[88vh] flex flex-col overflow-hidden animate-fade-in relative">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Log do Karaf</h4>
              <p className="text-[11px] text-muted-foreground">
                Log interno real do container (log:display / Pax Logging) — funciona também contra Karaf remoto.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-border/70 bg-card dark:bg-slate-900 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Filtrar linhas do log..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Últimas</span>
            <input
              type="number"
              min={1}
              max={5000}
              value={logLines}
              onChange={(e) => setLogLines(Number(e.target.value) || 200)}
              className="w-20 bg-background border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary font-mono"
            />
            <span>entradas</span>
          </div>
          <button
            type="button"
            onClick={handleRefreshLog}
            disabled={isLoadingLog}
            className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-xs font-bold text-foreground flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingLog ? 'animate-spin text-primary' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 bg-slate-950">
          {isLoadingLog ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
              <RotateCw className="w-6 h-6 animate-spin text-primary" />
              <span>Lendo log:display via client.bat...</span>
            </div>
          ) : filteredKarafLog ? (
            <pre className="text-[11px] font-mono whitespace-pre text-slate-200 overflow-x-auto min-w-full selection:bg-slate-800">{filteredKarafLog}</pre>
          ) : karafLog ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Nenhuma linha corresponde ao filtro "{logSearch}".
            </p>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">
              Nenhuma entrada de log retornada. Verifique se o Karaf está acessível (client.bat / SSH).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
