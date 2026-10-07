import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Search,
  WrapText,
  Download,
  RefreshCw,
  Copy,
  RotateCw
} from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';

export interface ContainerLogsModalProps {
  container: DockerContainerInfo;
  logs: string;
  isLoadingLogs: boolean;
  logLines: number;
  onSetLogLines: (lines: number) => void;
  onRefreshLogs: (silent?: boolean) => void;
  onDownloadLogs: () => void;
  onCopyLogs: () => void;
  copyFeedback: string | null;
  onClose: () => void;
}

export const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({
  container,
  logs,
  isLoadingLogs,
  logLines,
  onSetLogLines,
  onRefreshLogs,
  onDownloadLogs,
  onCopyLogs,
  copyFeedback,
  onClose
}) => {
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [isLogAutoRefresh, setIsLogAutoRefresh] = useState(false);
  const [isLogWrap, setIsLogWrap] = useState(true);

  // Auto-refresh interval para os logs a cada 3s quando ativado
  useEffect(() => {
    if (!isLogAutoRefresh) return;
    const timer = setInterval(() => {
      onRefreshLogs(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [isLogAutoRefresh, onRefreshLogs]);

  const filteredLogs = React.useMemo(() => {
    if (!logSearchQuery.trim()) return logs;
    const query = logSearchQuery.toLowerCase();
    const filtered = logs.split('\n').filter((l) => l.toLowerCase().includes(query));
    return filtered.length > 0
      ? filtered.join('\n')
      : `(Nenhuma linha corresponde ao filtro "${logSearchQuery}")`;
  }, [logs, logSearchQuery]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[82vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header do Modal */}
        <div className="px-4 py-3 bg-card border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-foreground">
              Logs:{' '}
              <span className="font-mono text-primary">{container.names.replace(/^\//, '')}</span>
            </h3>
            <span className="text-2xs text-muted-foreground font-mono bg-muted/70 px-1.5 py-0.2 rounded border border-border/50">
              {container.id.slice(0, 12)}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 flex-wrap">
            {/* Busca / Filtro nos logs */}
            <div className="relative hidden sm:block">
              <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Filtrar linhas..."
                className="bg-muted/70 border border-border/80 rounded-lg pl-6 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary w-28 md:w-36 font-mono text-2xs"
              />
            </div>

            {/* Auto-Refresh Live (3s) */}
            <button
              type="button"
              onClick={() => setIsLogAutoRefresh(!isLogAutoRefresh)}
              title={isLogAutoRefresh ? 'Desativar auto-refresh (a cada 3s)' : 'Ativar auto-refresh a cada 3s'}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                isLogAutoRefresh
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLogAutoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/60'
                }`}
              />
              <span className="hidden md:inline">Live</span>
            </button>

            {/* Toggle Quebra de Linha */}
            <button
              type="button"
              onClick={() => setIsLogWrap(!isLogWrap)}
              title={isLogWrap ? 'Desativar quebra de linha' : 'Ativar quebra de linha'}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLogWrap
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
              }`}
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>

            {/* Baixar Logs */}
            <button
              type="button"
              onClick={onDownloadLogs}
              title="Baixar logs como arquivo .log"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/70 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Quantidade de Linhas */}
            <select
              value={logLines}
              onChange={(e) => onSetLogLines(Number(e.target.value))}
              className="bg-muted/70 border border-border/80 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-hidden font-medium cursor-pointer"
            >
              <option value={100}>100 linhas</option>
              <option value={200}>200 linhas</option>
              <option value={500}>500 linhas</option>
              <option value={1000}>1000 linhas</option>
            </select>

            <button
              onClick={() => onRefreshLogs(false)}
              disabled={isLoadingLogs}
              title="Atualizar Logs"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/70 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-primary' : ''}`} />
            </button>

            <button
              onClick={onCopyLogs}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-muted/80 hover:bg-muted text-foreground border border-border/70 rounded-lg font-semibold transition cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copyFeedback || 'Copiar'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground font-bold px-2 py-1 text-xs rounded-lg hover:bg-muted cursor-pointer transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Conteúdo dos Logs */}
        <div
          className={`flex-1 bg-[#090D14] p-4 overflow-auto font-mono text-[11px] text-zinc-200 select-text leading-relaxed scrollbar-thin ${
            isLogWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
          }`}
        >
          {isLoadingLogs ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs space-x-2">
              <RotateCw className="w-4 h-4 animate-spin text-primary" />
              <span>Carregando logs do container...</span>
            </div>
          ) : (
            filteredLogs
          )}
        </div>
      </div>
    </div>
  );
};
