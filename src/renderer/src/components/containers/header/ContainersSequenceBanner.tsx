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
  <div className="p-3 mx-7 mt-3 bg-linear-to-r from-success/15 via-success/10 to-transparent border border-success/30 rounded-xl flex items-center justify-between text-xs text-success shadow-2xs">
    <div className="flex items-center space-x-2.5">
      <div className="w-7 h-7 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
        <RotateCw className="w-4 h-4 animate-spin text-success" />
      </div>
      <div>
        <div className="font-bold flex items-center gap-2">
          <span>Orquestrando Ambiente WinThor</span>
          <span className="text-2xs px-1.5 py-0.2 rounded bg-success/20 font-mono">
            Etapa {index} de {total}
          </span>
        </div>
        <p className="text-2xs text-muted-foreground mt-0.5">
          Iniciando <strong className="font-mono text-foreground">{currentName}</strong>
          {waitingSeconds !== undefined && waitingSeconds > 0 && (
            <span className="ml-2 font-semibold text-success">
              — aguardando warm-up ({waitingSeconds}s restantes)...
            </span>
          )}
        </p>
      </div>
    </div>
  </div>
);
