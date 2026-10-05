import React from 'react';
import { Radio, RotateCcw, Plus, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';
import { MonitoredPortConfig } from '../../../../../shared/types';
import { PortsQuickPresets } from './PortsQuickPresets';

interface PortsMonitoredCardProps {
  ports: MonitoredPortConfig[];
  onReset: () => void;
  onAddPort: (port?: number, label?: string) => void;
  onUpdatePort: (index: number, field: keyof MonitoredPortConfig, value: any) => void;
  onRemovePort: (index: number) => void;
}

export const PortsMonitoredCard: React.FC<PortsMonitoredCardProps> = ({
  ports,
  onReset,
  onAddPort,
  onUpdatePort,
  onRemovePort
}) => (
  <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1 flex flex-col">
    <div className="flex items-center justify-between pb-1 border-b border-border/60">
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" /> Lista Geral de Portas TCP Monitoradas
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Portas consultadas em tempo real na barra de status do painel de ambiente.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onReset}
          className="px-2.5 py-1 bg-card hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:border-rose-500/70 rounded-lg text-xs flex items-center gap-1 transition-colors shadow-sm"
          title="Restaurar portas padrão (:8889, :8101, :5005, :1521)"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restaurar Padrões</span>
        </button>

        <button
          type="button"
          onClick={() => onAddPort()}
          className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar Porta</span>
        </button>
      </div>
    </div>

    {/* Lista Rolável de Portas Configuradas */}
    <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
      {ports.map((portCfg, index) => (
        <div
          key={index}
          className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
            portCfg.enabled
              ? 'bg-card border-border hover:border-primary/40'
              : 'bg-muted/40 border-border/40 opacity-60'
          }`}
        >
          <button
            type="button"
            onClick={() => onUpdatePort(index, 'enabled', !portCfg.enabled)}
            className={`p-1 rounded text-xs transition-colors ${
              portCfg.enabled ? 'text-emerald-500' : 'text-muted-foreground'
            }`}
            title={portCfg.enabled ? 'Clique para Desativar' : 'Clique para Ativar'}
          >
            {portCfg.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          </button>

          {/* Número da Porta */}
          <div className="w-28">
            <div className="flex items-center bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-inner">
              <span className="text-primary font-mono text-xs select-none mr-1 font-bold">:</span>
              <input
                aria-label={portCfg.label ? `Porta do serviço ${portCfg.label}` : `Porta monitorada ${index + 1}`}
                type="number"
                value={portCfg.port || ''}
                onChange={(e) => onUpdatePort(index, 'port', e.target.value)}
                className="w-full bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                placeholder="8889"
              />
            </div>
          </div>

          {/* Descrição da Porta */}
          <div className="flex-1">
            <input
              aria-label={portCfg.port ? `Descrição da porta ${portCfg.port}` : `Descrição da porta monitorada ${index + 1}`}
              type="text"
              value={portCfg.label}
              onChange={(e) => onUpdatePort(index, 'label', e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              placeholder="Descrição do serviço (ex: Portal Web, Banco de Dados...)"
            />
          </div>

          {/* Botão Remover */}
          <button
            type="button"
            onClick={() => onRemovePort(index)}
            className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Remover Porta da Lista"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>

    <PortsQuickPresets onAddPort={onAddPort} />
  </div>
);
