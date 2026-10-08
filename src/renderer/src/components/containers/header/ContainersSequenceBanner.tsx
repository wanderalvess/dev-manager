import React from 'react';
import { RotateCw } from 'lucide-react';

interface ContainersSequenceBannerProps {
  currentName?: string;
  index?: number;
  total?: number;
  waitingSeconds?: number;
}

/** Banner de progresso da sequência WinThor (renderizado apenas enquanto a sequência roda). */
export const ContainersSequenceBanner: React.FC<ContainersSequenceBannerProps> = ({
  currentName,
  index,
  total,
  waitingSeconds
}) => (
  <div className="p-3.5 mx-4 mt-3 bg-linear-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 shadow-2xs">
    <div className="flex items-center space-x-2.5">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
        <RotateCw className="w-4 h-4 animate-spin text-emerald-500" />
      </div>
      <div>
        <div className="font-bold flex items-center gap-2">
          <span>Orquestrando Ambiente WinThor</span>
          <span className="text-2xs px-1.5 py-0.2 rounded bg-emerald-500/20 font-mono">
            Etapa {index} de {total}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Iniciando <strong className="font-mono text-foreground">{currentName}</strong>
          {waitingSeconds !== undefined && waitingSeconds > 0 && (
            <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
              — aguardando warm-up ({waitingSeconds}s restantes)...
            </span>
          )}
        </p>
      </div>
    </div>
  </div>
);
