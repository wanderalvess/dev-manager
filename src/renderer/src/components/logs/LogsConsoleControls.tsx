import React from 'react';
import { Play, Pause, RotateCcw, Copy, Check, Download, Lock, Unlock, WrapText } from 'lucide-react';

interface LogsConsoleControlsProps {
  isPaused: boolean;
  isAutoScroll: boolean;
  wordWrap: boolean;
  copyFeedback: string | null;
  onTogglePause: () => void;
  onToggleAutoScroll: () => void;
  onToggleWrap: () => void;
  onClearScreen: () => void;
  onCopyFiltered: () => void;
  onExport: () => void;
}

export const LogsConsoleControls: React.FC<LogsConsoleControlsProps> = ({
  isPaused,
  isAutoScroll,
  wordWrap,
  copyFeedback,
  onTogglePause,
  onToggleAutoScroll,
  onToggleWrap,
  onClearScreen,
  onCopyFiltered,
  onExport
}) => (
  <div className="flex items-center space-x-1.5">
    {/* Pausar / Retomar */}
    <button
      onClick={onTogglePause}
      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 border transition-colors ${
        isPaused
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
          : 'bg-muted/80 text-foreground border-border/80 hover:bg-muted'
      }`}
      title={isPaused ? 'Retomar transmissão ao vivo' : 'Pausar fluxo na tela'}
    >
      {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3 text-muted-foreground" />}
      <span className="hidden sm:inline">{isPaused ? 'Retomar' : 'Pausar'}</span>
    </button>

    {/* Auto-scroll Lock */}
    <button
      onClick={onToggleAutoScroll}
      className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 border transition-colors ${
        isAutoScroll
          ? 'bg-primary/15 text-primary border-primary/40 font-bold'
          : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
      }`}
      title={isAutoScroll ? 'Auto-scroll ativado (travar no final)' : 'Auto-scroll desativado (rolagem livre)'}
    >
      {isAutoScroll ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      <span className="hidden md:inline">Auto-scroll</span>
    </button>

    {/* Quebra de Linha (Wrap) */}
    <button
      onClick={onToggleWrap}
      className={`p-1.5 rounded-lg border transition-colors ${
        wordWrap
          ? 'bg-primary/15 text-primary border-primary/40'
          : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
      }`}
      title={wordWrap ? 'Desativar quebra de linhas (Wrap)' : 'Ativar quebra de linhas (Wrap)'}
    >
      <WrapText className="w-3.5 h-3.5" />
    </button>

    {/* Limpar Tela */}
    <button
      onClick={onClearScreen}
      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
      title="Limpar tela atual (Ctrl+L)"
    >
      <RotateCcw className="w-3.5 h-3.5" />
    </button>

    {/* Copiar Logs Filtrados */}
    <button
      data-tour="acoes-limpar-exportar"
      onClick={onCopyFiltered}
      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
      title="Copiar linhas filtradas"
    >
      {copyFeedback === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>

    {/* Baixar TXT */}
    <button
      onClick={onExport}
      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
      title="Exportar arquivo .txt com linhas filtradas"
    >
      <Download className="w-3.5 h-3.5" />
    </button>
  </div>
);
