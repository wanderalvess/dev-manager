import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TrackedProcessConfig, TrackedServiceConfig } from '../../../../../shared/types';
import { Switch } from '../../ui/Switch';
import { SETTINGS_BUTTON_CLASS, SETTINGS_GHOST_BUTTON_CLASS, SETTINGS_INPUT_CLASS, SettingsEmpty } from '../SettingsCard';

const ROW = 'rounded-xl border border-border px-3 py-2.5 flex flex-wrap items-center gap-3';
const NAME_INPUT = SETTINGS_INPUT_CLASS.replace('font-mono', 'font-sans');

const ListHeader: React.FC<{ title: string; count: string; addLabel: string; onAdd: () => void; onClear: () => void; canClear: boolean }> = ({
  title,
  count,
  addLabel,
  onAdd,
  onClear,
  canClear
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <span className="text-[13px] font-semibold text-foreground">
      {title} <span className="font-normal text-muted-foreground">· {count}</span>
    </span>
    <div className="flex items-center gap-1">
      {canClear && (
        <button type="button" onClick={onClear} className={`${SETTINGS_GHOST_BUTTON_CLASS} hover:text-danger`}>
          Limpar lista
        </button>
      )}
      <button type="button" onClick={onAdd} className={SETTINGS_BUTTON_CLASS}>
        <Plus className="w-3.5 h-3.5" /> {addLabel}
      </button>
    </div>
  </div>
);

const RemoveButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 cursor-pointer"
  >
    <Trash2 className="w-4 h-4" />
  </button>
);

interface ServiceListProps {
  services: TrackedServiceConfig[];
  onAdd: () => void;
  onClear: () => void;
  onUpdate: (index: number, field: keyof TrackedServiceConfig, value: unknown) => void;
  onRemove: (index: number) => void;
}

/** Serviços Windows que a preparação para e, se pedido, volta a iniciar. */
export const DebugServiceList: React.FC<ServiceListProps> = ({ services, onAdd, onClear, onUpdate, onRemove }) => {
  const enabled = services.filter((s) => s.enabled).length;
  return (
    <div id="field-services" className="space-y-2.5">
      <ListHeader
        title="Serviços Windows"
        count={`${enabled} de ${services.length} ligados`}
        addLabel="Adicionar serviço"
        onAdd={onAdd}
        onClear={onClear}
        canClear={services.length > 0}
      />
      {services.length === 0 ? (
        <SettingsEmpty>Nenhum serviço na lista. Adicione o serviço que costuma prender a porta do Karaf ou o banco local.</SettingsEmpty>
      ) : (
        services.map((srv, index) => (
          <div key={index} className={`${ROW} ${srv.enabled ? '' : 'opacity-60'}`}>
            <Switch
              checked={srv.enabled}
              onChange={(v) => onUpdate(index, 'enabled', v)}
              label={`Usar o serviço ${srv.displayName || srv.name} na preparação`}
            />
            <input
              aria-label="Nome amigável"
              value={srv.displayName}
              onChange={(e) => onUpdate(index, 'displayName', e.target.value)}
              className={`${NAME_INPUT} flex-1 min-w-40`}
              placeholder="Nome amigável"
            />
            <input
              aria-label="Nome do serviço no Windows"
              value={srv.name}
              onChange={(e) => onUpdate(index, 'name', e.target.value)}
              className={`${SETTINGS_INPUT_CLASS} flex-1 min-w-40`}
              placeholder="Nome do serviço"
            />
            <RemoveButton label={`Remover o serviço ${srv.displayName || srv.name}`} onClick={() => onRemove(index)} />
            <div className="basis-full flex flex-wrap gap-x-5 gap-y-1 pl-14 text-xs text-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={srv.autoStop ?? true}
                  onChange={(e) => onUpdate(index, 'autoStop', e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Para na preparação
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={srv.autoStart ?? false}
                  onChange={(e) => onUpdate(index, 'autoStart', e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Volta a iniciar depois
              </label>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

interface ProcessListProps {
  processes: TrackedProcessConfig[];
  onAdd: () => void;
  onClear: () => void;
  onUpdate: (index: number, field: keyof TrackedProcessConfig, value: unknown) => void;
  onRemove: (index: number) => void;
}

/** Processos encerrados para liberar portas e arquivos antes do debug. */
export const DebugProcessList: React.FC<ProcessListProps> = ({ processes, onAdd, onClear, onUpdate, onRemove }) => (
  <div id="field-processes" className="space-y-2.5">
    <ListHeader
      title="Processos para encerrar"
      count={String(processes.length)}
      addLabel="Adicionar processo"
      onAdd={onAdd}
      onClear={onClear}
      canClear={processes.length > 0}
    />
    {processes.length === 0 ? (
      <SettingsEmpty>Nenhum processo na lista. Adicione o .exe que costuma ocupar a porta do Karaf ou do portal.</SettingsEmpty>
    ) : (
      processes.map((proc, index) => (
        <div key={index} className={`${ROW} ${proc.enabled ? '' : 'opacity-60'}`}>
          <Switch
            checked={proc.enabled}
            onChange={(v) => onUpdate(index, 'enabled', v)}
            label={`Encerrar ${proc.displayName || proc.name} na preparação`}
          />
          <input
            aria-label="Nome amigável"
            value={proc.displayName}
            onChange={(e) => onUpdate(index, 'displayName', e.target.value)}
            className={`${NAME_INPUT} flex-1 min-w-40`}
            placeholder="Nome amigável"
          />
          <input
            aria-label="Nome do executável (.exe)"
            value={proc.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className={`${SETTINGS_INPUT_CLASS} flex-1 min-w-40`}
            placeholder="processo.exe"
          />
          <RemoveButton label={`Remover o processo ${proc.displayName || proc.name}`} onClick={() => onRemove(index)} />
        </div>
      ))
    )}
  </div>
);
