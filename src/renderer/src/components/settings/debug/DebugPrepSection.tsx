import React from 'react';
import type { AppSettings, EnvironmentAutomationConfig } from '../../../../../shared/types';
import type { useTrackedLists } from '../../../hooks/settings/useTrackedLists';
import { DEFAULT_AUTOMATION, DEFAULT_PROCESSES, DEFAULT_SERVICES } from '../../../utils/settingsDefaults';
import { SETTINGS_BUTTON_CLASS, SettingsCard } from '../SettingsCard';
import { DebugProcessList, DebugServiceList } from './DebugTrackedLists';

interface DebugPrepSectionProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  lists: ReturnType<typeof useTrackedLists>;
  onOpenEnvironment?: () => void;
}

const DefaultCheck: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({
  checked,
  onChange,
  label,
  hint
}) => (
  <label className="flex items-start gap-3 cursor-pointer text-sm text-foreground">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary shrink-0" />
    <span>
      {label}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </span>
  </label>
);

/**
 * O que o Hub faz, em ordem, quando você prepara o ambiente: 1. libera a máquina (serviços e processos), 2. sobe
 * o ambiente. Os perfis próprios ficam em Ambiente Dev; aqui só aparecem para consulta.
 */
export const DebugPrepSection: React.FC<DebugPrepSectionProps> = ({ settings, setSettings, lists, onOpenEnvironment }) => {
  const auto = settings.automationDefaults || DEFAULT_AUTOMATION;
  const setAuto = (key: keyof EnvironmentAutomationConfig, value: boolean) =>
    setSettings((prev) => ({ ...prev, automationDefaults: { ...(prev.automationDefaults || DEFAULT_AUTOMATION), [key]: value } }));
  const profiles = settings.automationProfiles || [];
  const activeId = settings.activeProfileId || profiles[0]?.id;

  return (
    <div className="space-y-4" id="field-automation">
      <SettingsCard step={1} title="Liberar a máquina" description="Antes do debug, o Hub para os serviços e encerra os processos que prendem portas.">
        <DefaultCheck checked={auto.stopServices ?? true} onChange={(v) => setAuto('stopServices', v)} label="Parar os serviços Windows abaixo" />
        <DebugServiceList
          services={settings.trackedServices || DEFAULT_SERVICES}
          onAdd={() => lists.handleAddService()}
          onClear={() => void lists.handleResetServices()}
          onUpdate={lists.handleUpdateService}
          onRemove={lists.handleRemoveService}
        />
        <div className="border-t border-border pt-4 space-y-4">
          <DefaultCheck
            checked={auto.killProcesses ?? true}
            onChange={(v) => setAuto('killProcesses', v)}
            label="Encerrar os processos que prendem portas"
          />
          <DebugProcessList
            processes={settings.trackedProcesses || DEFAULT_PROCESSES}
            onAdd={() => lists.handleAddProcess()}
            onClear={() => void lists.handleResetProcesses()}
            onUpdate={lists.handleUpdateProcess}
            onRemove={lists.handleRemoveProcess}
          />
        </div>
      </SettingsCard>

      <SettingsCard step={2} title="Subir o ambiente" description="O que já vem marcado no painel de preparação de Ambiente Dev.">
        <div className="space-y-3">
          <DefaultCheck
            checked={auto.startKaraf ?? true}
            onChange={(v) => setAuto('startKaraf', v)}
            label="Iniciar o Karaf em modo debug"
            hint={`Na porta ${settings.karafDebugPort ?? 5005}, definida em Karaf.`}
          />
          <DefaultCheck checked={auto.launchIde ?? true} onChange={(v) => setAuto('launchIde', v)} label="Abrir a IDE configurada" />
          <DefaultCheck checked={auto.openBrowser ?? false} onChange={(v) => setAuto('openBrowser', v)} label="Abrir o portal web no navegador" />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Perfis de automação"
        description="Sequências próprias que substituem o padrão acima. Criadas e editadas em Ambiente Dev."
        actions={
          onOpenEnvironment && (
            <button type="button" onClick={onOpenEnvironment} className={SETTINGS_BUTTON_CLASS}>
              Editar em Ambiente Dev
            </button>
          )
        }
      >
        {profiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum perfil próprio: a preparação usa o padrão acima.</p>
        ) : (
          <ul className="divide-y divide-border">
            {profiles.map((prof) => (
              <li key={prof.id} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground truncate">{prof.name}</span>
                  {prof.description && <span className="block text-xs text-muted-foreground truncate">{prof.description}</span>}
                </span>
                <span className="text-xs font-mono rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{prof.steps?.length || 0} passos</span>
                {prof.id === activeId && (
                  <span className="text-xs font-mono font-semibold rounded-full bg-accent px-2 py-0.5 text-accent-foreground">em uso</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  );
};
