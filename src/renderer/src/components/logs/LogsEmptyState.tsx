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
  <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center select-none space-y-3">
    <ScrollText className="w-12 h-12 text-slate-600 stroke-[1.5]" />
    <div className="space-y-1.5 max-w-lg">
      <p className="text-sm font-semibold text-slate-300">Nenhum log para exibir no momento</p>
      {!hasSources ? (
        <div className="text-xs text-slate-300 leading-relaxed bg-white/5 border border-white/10 p-3 rounded-xl">
          Nenhuma fonte de log configurada.{' '}
          <button onClick={onOpenManage} className="text-amber-300 underline font-semibold">
            Cadastre um arquivo de log
          </button>{' '}
          para começar a acompanhar em tempo real.
        </div>
      ) : status && !status.exists ? (
        <div className="text-xs text-danger/90 leading-relaxed bg-danger/20 border border-danger/40 p-3 rounded-xl">
          O arquivo <code className="text-foreground font-mono font-bold">{filePath}</code> não
          foi encontrado. O Hub Manager está em escuta contínua e iniciará a transmissão assim que o serviço
          gravar as primeiras saídas.
        </div>
      ) : hasActiveFilter ? (
        <p className="text-xs text-slate-300">
          Nenhum registro corresponde aos filtros selecionados. Tente limpar os critérios de busca.
        </p>
      ) : (
        <p className="text-xs text-slate-300">
          Arquivo de log conectado e monitorado. Novas entradas de telemetria surgirão aqui em tempo real.
        </p>
      )}
    </div>
  </div>
);
