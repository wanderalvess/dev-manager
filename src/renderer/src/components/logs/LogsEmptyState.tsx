import React from 'react';
import { ScrollText } from 'lucide-react';
import { LogWatchStatus } from '../../../../shared/types';

interface LogsEmptyStateProps {
  hasSources: boolean;
  status: LogWatchStatus | null;
  filePath: string;
  hasActiveFilter: boolean;
  onOpenManage: () => void;
}

export const LogsEmptyState: React.FC<LogsEmptyStateProps> = ({
  hasSources,
  status,
  filePath,
  hasActiveFilter,
  onOpenManage
}) => (
  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center select-none space-y-3">
    <ScrollText className="w-12 h-12 text-muted-foreground/40 stroke-[1.5]" />
    <div className="space-y-1.5 max-w-lg">
      <p className="text-sm font-semibold text-muted-foreground">Nenhum log para exibir no momento</p>
      {!hasSources ? (
        <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 border border-border/50 p-3 rounded-xl">
          Nenhuma fonte de log configurada.{' '}
          <button onClick={onOpenManage} className="text-primary underline font-semibold">
            Cadastre um arquivo de log
          </button>{' '}
          para começar a acompanhar em tempo real.
        </div>
      ) : status && !status.exists ? (
        <div className="text-xs text-rose-400/90 leading-relaxed bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl">
          O arquivo <code className="text-foreground font-mono font-bold">{filePath}</code> não
          foi encontrado. O Hub Manager está em escuta contínua e iniciará a transmissão assim que o serviço
          gravar as primeiras saídas.
        </div>
      ) : hasActiveFilter ? (
        <p className="text-xs text-muted-foreground">
          Nenhum registro corresponde aos filtros selecionados. Tente limpar os critérios de busca.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Arquivo de log conectado e monitorado. Novas entradas de telemetria surgirão aqui em tempo real.
        </p>
      )}
    </div>
  </div>
);
