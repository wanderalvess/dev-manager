import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MonitoredPortConfig } from '../../../../../shared/types';
import { Switch } from '../../ui/Switch';
import { SETTINGS_BUTTON_CLASS, SETTINGS_GHOST_BUTTON_CLASS, SETTINGS_INPUT_CLASS, SettingsCard, SettingsEmpty } from '../SettingsCard';
import { PortsQuickPresets } from './PortsQuickPresets';

interface PortsMonitoredCardProps {
  ports: MonitoredPortConfig[];
  onReset: () => void;
  onAddPort: (port?: number, label?: string) => void;
  onUpdatePort: (index: number, field: keyof MonitoredPortConfig, value: any) => void;
  onRemovePort: (index: number) => void;
}

/** Portas que Ambiente Dev mostra como livres ou ocupadas (e por qual processo). */
export const PortsMonitoredCard: React.FC<PortsMonitoredCardProps> = ({ ports, onReset, onAddPort, onUpdatePort, onRemovePort }) => (
  <SettingsCard
    title="Portas vigiadas"
    description="Ambiente Dev mostra se cada uma está livre ou ocupada, e por qual processo."
    actions={
      <>
        <button type="button" onClick={onReset} className={SETTINGS_GHOST_BUTTON_CLASS} title="Volta às portas padrão (:8889, :9195, :8101, :5005, :1521)">
          Restaurar padrão
        </button>
        <button type="button" onClick={() => onAddPort()} className={SETTINGS_BUTTON_CLASS}>
          <Plus className="w-3.5 h-3.5" /> Adicionar porta
        </button>
      </>
    }
  >
    {ports.length === 0 ? (
      <SettingsEmpty>Nenhuma porta vigiada. Use os atalhos abaixo ou adicione a porta do serviço que você quer acompanhar.</SettingsEmpty>
    ) : (
      <ul className="divide-y divide-border">
        {ports.map((portCfg, index) => (
          <li key={index} className={`flex flex-wrap items-center gap-3 py-2.5 ${portCfg.enabled ? '' : 'opacity-60'}`}>
            <Switch
              checked={portCfg.enabled}
              onChange={(v) => onUpdatePort(index, 'enabled', v)}
              label={`Vigiar a porta ${portCfg.port || index + 1}`}
            />
            <input
              aria-label={portCfg.label ? `Porta do serviço ${portCfg.label}` : `Porta monitorada ${index + 1}`}
              type="number"
              value={portCfg.port || ''}
              onChange={(e) => onUpdatePort(index, 'port', e.target.value)}
              className={`${SETTINGS_INPUT_CLASS} w-28`}
              placeholder="8889"
            />
            <input
              aria-label={portCfg.port ? `Descrição da porta ${portCfg.port}` : `Descrição da porta monitorada ${index + 1}`}
              value={portCfg.label}
              onChange={(e) => onUpdatePort(index, 'label', e.target.value)}
              className={`${SETTINGS_INPUT_CLASS.replace('font-mono', 'font-sans')} flex-1 min-w-48`}
              placeholder="Ex: Portal web, banco de dados"
            />
            <button
              type="button"
              onClick={() => onRemovePort(index)}
              className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 cursor-pointer"
              title="Tirar a porta da lista"
              aria-label={`Tirar a porta ${portCfg.port || index + 1} da lista`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    )}

    <PortsQuickPresets onAddPort={onAddPort} />
  </SettingsCard>
);
