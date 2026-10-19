import React from 'react';
import { LayoutGrid, RotateCcw } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';
import { getEnabledModuleIds, isModuleEnabled } from '../../../../../shared/appModules';
import { NAV_THEME_GROUPS } from '../../header/headerNavConfig';
import { toggleModule } from '../../../utils/moduleVisibility';

interface ModulesTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const ModulesTab: React.FC<ModulesTabProps> = ({ settings, setSettings }) => {
  const disabled = settings.disabledModules ?? [];
  const enabledCount = getEnabledModuleIds(disabled).length;
  const totalCount = NAV_THEME_GROUPS.reduce((sum, group) => sum + group.items.length, 0);

  const setModule = (id: string, enabled: boolean) =>
    setSettings((prev) => ({ ...prev, disabledModules: toggleModule(prev.disabledModules ?? [], id, enabled) }));

  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border flex-1" id="field-modules">
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/60">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" /> Módulos da Navegação
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Escolha quais páginas aparecem no cabeçalho, na busca rápida (Ctrl+K) e nos atalhos Alt+N. Módulo desligado
            não perde configurações nem dados — só sai da navegação. Ajuda e Configurações ficam sempre disponíveis.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xs font-mono font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/60">
            {enabledCount}/{totalCount} ligados
          </span>
          <button
            type="button"
            disabled={disabled.length === 0}
            onClick={() => setSettings((prev) => ({ ...prev, disabledModules: [] }))}
            className="h-7 px-2.5 rounded-lg text-2xs font-semibold border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3 h-3" /> Ligar todos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {NAV_THEME_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const groupEnabled = group.items.filter((item) => isModuleEnabled(item.id, disabled)).length;
          return (
            <div key={group.id} className="space-y-2 bg-muted/30 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-2xs flex items-center gap-1.5">
                  <GroupIcon className="w-3.5 h-3.5 text-primary" /> {group.title}
                </h4>
                <span className="text-2xs font-mono text-muted-foreground">
                  {groupEnabled === 0 ? 'oculto no cabeçalho' : `${groupEnabled}/${group.items.length}`}
                </span>
              </div>
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const checked = isModuleEnabled(item.id, disabled);
                const isLast = checked && enabledCount === 1;
                const hint = isLast
                  ? 'Pelo menos uma página precisa ficar ligada'
                  : checked
                    ? `Desligar ${item.label}`
                    : `Ligar ${item.label}`;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-card border border-border/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ItemIcon className={`w-4 h-4 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="min-w-0">
                        <div className={`font-semibold truncate ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.label}
                          {item.shortcut && <span className="ml-2 text-2xs font-mono text-muted-foreground">{item.shortcut}</span>}
                        </div>
                        <div className="text-2xs text-muted-foreground truncate">{item.description}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={hint}
                      title={hint}
                      disabled={isLast}
                      onClick={() => setModule(item.id, !checked)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                        checked ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
