import React from 'react';
import {
  ScrollText,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  HardDrive,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { RealtimeLogSource, LogWatchStatus } from '../../../../shared/types';
import { formatFileSize } from '../../utils/logsFilterUtils';

interface LogsHeaderProps {
  sources: RealtimeLogSource[];
  activeSource: RealtimeLogSource;
  activeSourceId: string;
  status: LogWatchStatus | null;
  isPaused: boolean;
  copyFeedback: string | null;
  onSelectSource: (id: string) => void;
  onOpenManage: () => void;
  onOpenTour: () => void;
  onCopyPath: () => void;
  onRequestClearFile: () => void;
}

export const LogsHeader: React.FC<LogsHeaderProps> = ({
  sources,
  activeSource,
  activeSourceId,
  status,
  isPaused,
  copyFeedback,
  onSelectSource,
  onOpenManage,
  onOpenTour,
  onCopyPath,
  onRequestClearFile
}) => (
  <div className="bg-card/95 border-b border-border/80 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-10 backdrop-blur-xs">
    {/* Esquerda: Seletor de Fontes em Pílulas */}
    <div className="flex items-center space-x-2">
      <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary shrink-0" title="Logs em Tempo Real (Tail -f)">
        <ScrollText className="w-4 h-4" />
      </div>
      <div className="flex items-center space-x-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
        {sources.map((src) => {
          const isSelected = src.id === activeSourceId;
          return (
            <button
              key={src.id}
              data-tour="selecionar-fonte-log"
              onClick={() => onSelectSource(src.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-card text-foreground shadow-2xs font-bold border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              title={src.filePath}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSelected && status?.exists ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'
                }`}
              />
              <span>{src.name}</span>
            </button>
          );
        })}
      </div>

      <button
        data-tour="gerenciar-fontes"
        onClick={onOpenManage}
        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
        title="Gerenciar Fontes de Log" aria-label="Gerenciar Fontes de Log"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onOpenTour}
        className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted border border-border/50 transition-colors"
        title="Rever o tour guiado desta página" aria-label="Rever o tour guiado desta página"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
    </div>

    {/* Centro: Telemetria do Arquivo Ativo */}
    {sources.length > 0 && (
      <div className="hidden lg:flex items-center space-x-3 text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-1 rounded-xl border border-border/50">
        <div className="flex items-center space-x-1.5 max-w-sm xl:max-w-md truncate">
          <span className="truncate text-muted-foreground text-2xs" title={activeSource.filePath}>
            {activeSource.filePath}
          </span>
          <button
            onClick={onCopyPath}
            className="p-1 text-muted-foreground hover:text-foreground rounded shrink-0 transition-colors"
            title="Copiar caminho completo do arquivo"
          >
            {copyFeedback === 'path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {status && status.exists && (
          <div className="flex items-center space-x-2.5 text-2xs border-l border-border/60 pl-2.5 shrink-0">
            <span className="text-muted-foreground font-bold flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-primary" />
              {formatFileSize(status.fileSizeBytes)}
            </span>
            {status.lastModified && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(status.lastModified).toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        )}
      </div>
    )}

    {/* Direita: Status da Conexão e Ações Críticas */}
    <div className="flex items-center space-x-2" data-tour="status-conexao-live">
      {status?.exists ? (
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-2xs font-mono font-bold border transition-colors ${
            isPaused
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
            }`}
          />
          <span>{isPaused ? 'STREAM PAUSADO' : 'LIVE TAIL'}</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-2xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-3 h-3" />
          <span>{sources.length > 0 ? 'ARQUIVO AUSENTE' : 'NENHUMA FONTE'}</span>
        </div>
      )}

      {sources.length > 0 && (
        <button
          onClick={onRequestClearFile}
          className="px-2 py-1 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-lg hover:bg-rose-500/10 border border-border/60 hover:border-rose-500/30 transition-colors flex items-center space-x-1"
          title="Zerar o arquivo no disco (ação destrutiva para novos testes)"
        >
          <Trash2 className="w-3 h-3" />
          <span className="hidden sm:inline">Zerar no Disco</span>
        </button>
      )}
    </div>
  </div>
);
