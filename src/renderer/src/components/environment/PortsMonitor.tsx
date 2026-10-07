import React from 'react';
import { Radio, HelpCircle, Settings } from 'lucide-react';
import type { PortStatus } from '../../../../shared/types';

interface PortsMonitorProps {
  ports: PortStatus[];
  isChecking: boolean;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: (search?: string) => void;
}

/** Monitor de portas configuradas, com atalhos de ajuda e configuração. */
export const PortsMonitor: React.FC<PortsMonitorProps> = ({
  ports,
  isChecking,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  const activePortsCount = ports.filter((p) => p.inUse).length;

  return (
    <div className="md:col-span-8 bg-card border border-border/80 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs" data-tour="ports-monitor">
      <div className="flex items-center space-x-2">
        <Radio className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-primary' : 'text-primary'}`} />
        <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
          Portas Monitoradas ({activePortsCount}/{ports.length} ativas):
        </span>
        {onNavigateToHelp && (
          <button
            onClick={() => onNavigateToHelp('em uso')}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
            title="O que significa uma porta 'Em uso'? Ver na Central de Ajuda"
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        )}
        {onNavigateToSettings && (
          <button
            onClick={onNavigateToSettings}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
            title="Personalizar portas monitoradas nas Configurações"
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {ports.map((p) => (
          <div
            key={p.port}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
              p.inUse
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-semibold'
                : 'bg-muted/40 border-border/60 text-muted-foreground'
            }`}
            title={`${p.label} - ${p.inUse ? `Porta ocupada (PID: ${p.pid || 'Ativo'})` : 'Porta livre / desconectada'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${p.inUse ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
            <span>:{p.port}</span>
            <span className="text-2xs text-muted-foreground font-sans hidden sm:inline">({p.label.split(' ')[0]})</span>
            {onNavigateToHelp && p.label.toLowerCase().includes('debug') && (
              <HelpCircle
                className="w-2.5 h-2.5 opacity-60 hover:opacity-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToHelp('breakpoints');
                }}
                aria-label="Como conectar o debug remoto do IntelliJ nesta porta"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
