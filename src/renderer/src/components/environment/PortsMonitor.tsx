import React from 'react';
import { HelpCircle, Settings } from 'lucide-react';
import type { PortStatus } from '../../../../shared/types';

interface PortsMonitorProps {
  ports: PortStatus[];
  isChecking: boolean;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: (search?: string) => void;
}

/** Monitor de portas configuradas: uma linha por porta, com estado em palavras e atalhos de ajuda e configuração. */
export const PortsMonitor: React.FC<PortsMonitorProps> = ({
  ports,
  isChecking,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  const activePortsCount = ports.filter((p) => p.inUse).length;

  return (
    <div className="bg-card border border-border rounded-[14px] shadow-xs" data-tour="ports-monitor">
      <div className="flex items-center gap-2 px-5 pt-4">
        <h2 className="text-base font-semibold text-foreground">Portas monitoradas</h2>
        {onNavigateToHelp && (
          <button
            type="button"
            onClick={() => onNavigateToHelp('em uso')}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted cursor-pointer"
            title="O que significa uma porta 'Em uso'? Ver na Central de Ajuda" aria-label="O que significa uma porta 'Em uso'? Ver na Central de Ajuda"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted cursor-pointer"
            title="Personalizar portas monitoradas nas Configurações" aria-label="Personalizar portas monitoradas nas Configurações"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
        <span className={`ml-auto text-[13px] text-muted-foreground ${isChecking ? 'animate-pulse' : ''}`}>
          {activePortsCount} de {ports.length} abertas
        </span>
      </div>

      <ul className="px-5 pb-3 pt-1">
        {ports.map((p) => (
          <li
            key={p.port}
            className="flex items-center gap-3 py-2.5 border-t border-border first:border-t-0"
            title={`${p.label} - ${p.inUse ? `Porta ocupada (PID: ${p.pid || 'Ativo'})` : 'Porta livre / desconectada'}`}
          >
            <span className="font-mono text-[13px] text-foreground w-12">{p.port}</span>
            <span className="text-[13px] text-muted-foreground flex-1 truncate">{p.label}</span>
            {onNavigateToHelp && p.label.toLowerCase().includes('debug') && (
              <button
                type="button"
                onClick={() => onNavigateToHelp('breakpoints')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Como conectar o debug remoto do IntelliJ nesta porta"
                title="Como conectar o debug remoto do IntelliJ nesta porta"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <span
              className={`text-[13px] font-medium px-2.5 py-0.5 rounded-full border ${
                p.inUse
                  ? 'bg-success/10 text-success border-transparent'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {p.inUse ? 'Aberta' : 'Fechada'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
