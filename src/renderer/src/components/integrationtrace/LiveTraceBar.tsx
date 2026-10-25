import React from 'react';
import { Loader2, Pause, Radio } from 'lucide-react';

interface LiveTraceBarProps {
  active: boolean;
  checking: boolean;
  attempts: number;
  secondsLeft: number;
  stopReason: string | null;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
}

const BUTTON = 'h-7 px-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5';

/** Linha do modo ao vivo sob a vista animada: contagem até a próxima consulta e o botão de parar ou retomar. */
export const LiveTraceBar: React.FC<LiveTraceBarProps> = ({ active, checking, attempts, secondsLeft, stopReason, canStart, onStart, onStop }) => {
  if (!active && !canStart && !stopReason) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs" data-testid="trace-live">
      {active ? (
        <p className="flex items-center gap-2 text-foreground" role="status">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-75 animate-ping motion-reduce:animate-none" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-warning" />
          </span>
          {checking ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Consultando o PDVSync…
            </span>
          ) : (
            <span>
              Ao vivo · próxima consulta em {secondsLeft}s{attempts > 0 ? ` · ${attempts} consulta(s) feita(s)` : ''}
            </span>
          )}
        </p>
      ) : (
        <p className="text-muted-foreground break-words">{stopReason ?? 'As lojas ainda estão baixando o lote.'}</p>
      )}
      {active ? (
        <button type="button" onClick={onStop} className={BUTTON}>
          <Pause className="w-3 h-3" /> Parar
        </button>
      ) : (
        canStart && (
          <button type="button" onClick={onStart} className={BUTTON}>
            <Radio className="w-3 h-3" /> Acompanhar ao vivo
          </button>
        )
      )}
    </div>
  );
};
