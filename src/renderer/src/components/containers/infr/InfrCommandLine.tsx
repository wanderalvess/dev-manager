import React from 'react';
import { Check, Copy, Play } from 'lucide-react';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

interface InfrCommandLineProps {
  command: string;
  label?: string;
  /** Abre o comando no terminal da distro; sem ele, só Copiar */
  onRun?: () => void;
  runLabel?: string;
  /** Bloco escuro de várias linhas (comando longo) em vez de uma linha */
  block?: boolean;
}

/** Um comando do INFR-Docker com Copiar e, quando dá, Executar: tudo o que a tela mostra pode ir para o terminal. */
export const InfrCommandLine: React.FC<InfrCommandLineProps> = ({ command, label, onRun, runLabel = 'Executar', block }) => {
  const { copy, copiedKey } = useCopyToClipboard(2000);
  const copied = copiedKey === command;
  const buttons = (
    <div className="flex gap-2 shrink-0">
      <button
        type="button"
        onClick={() => copy(command, command)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
      {onRun && (
        <button
          type="button"
          onClick={onRun}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-warning/60 text-warning bg-card text-xs font-semibold hover:bg-warning/10 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" /> {runLabel}
        </button>
      )}
    </div>
  );

  if (block) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {label && <p className="flex-1 text-sm font-semibold text-foreground">{label}</p>}
          {buttons}
        </div>
        <pre className="p-3 bg-[#090D14] rounded-lg text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-text leading-relaxed">{command}</pre>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {label && <span className="w-40 shrink-0 text-xs text-foreground/80">{label}</span>}
      <code className="flex-1 min-w-[16rem] px-2.5 py-1.5 rounded-md bg-muted/60 text-xs font-mono text-foreground break-all select-text">{command}</code>
      {buttons}
    </div>
  );
};
