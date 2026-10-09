import React from 'react';
import { Zap, Layers } from 'lucide-react';
import { AppSettings, EnvironmentAutomationConfig } from '../../../../../shared/types';

interface AutomationTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  defaultAutomation: EnvironmentAutomationConfig;
}

export const AutomationTab: React.FC<AutomationTabProps> = ({
  settings,
  setSettings,
  defaultAutomation
}) => {
  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border flex-1" id="field-automation">
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Preferências Padrão de Automação
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Defina o comportamento pré-selecionado ao abrir o Painel de Preparação de Ambiente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
          <h4 className="font-bold text-foreground uppercase tracking-wider text-2xs">
            Ações Pré-Debug Padrão
          </h4>

          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.automationDefaults?.stopServices ?? true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  automationDefaults: {
                    ...(settings.automationDefaults || defaultAutomation),
                    stopServices: e.target.checked
                  }
                })
              }
              className="rounded border-border text-primary h-4 w-4"
            />
            <span className="font-semibold text-foreground">Parar Serviços Windows por Padrão</span>
          </label>

          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.automationDefaults?.killProcesses ?? true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  automationDefaults: {
                    ...(settings.automationDefaults || defaultAutomation),
                    killProcesses: e.target.checked
                  }
                })
              }
              className="rounded border-border text-primary h-4 w-4"
            />
            <span className="font-semibold text-foreground">Finalizar Processos Conflitantes (Liberar Portas)</span>
          </label>
        </div>

        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
          <h4 className="font-bold text-foreground uppercase tracking-wider text-2xs">
            Ações de Inicialização Padrão
          </h4>

          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.automationDefaults?.launchIde ?? true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  automationDefaults: {
                    ...(settings.automationDefaults || defaultAutomation),
                    launchIde: e.target.checked
                  }
                })
              }
              className="rounded border-border text-primary h-4 w-4"
            />
            <span className="font-semibold text-foreground">Inicializar IDE configurada automaticamente</span>
          </label>

          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.automationDefaults?.startKaraf ?? true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  automationDefaults: {
                    ...(settings.automationDefaults || defaultAutomation),
                    startKaraf: e.target.checked
                  }
                })
              }
              className="rounded border-border text-primary h-4 w-4"
            />
            <span className="font-semibold text-foreground">Iniciar Servidor OSGi Debug</span>
          </label>

          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.automationDefaults?.openBrowser ?? false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  automationDefaults: {
                    ...(settings.automationDefaults || defaultAutomation),
                    openBrowser: e.target.checked
                  }
                })
              }
              className="rounded border-border text-primary h-4 w-4"
            />
            <span className="font-semibold text-foreground">Abrir Portal Web no Navegador</span>
          </label>
        </div>
      </div>

      {/* Lista de Perfis de Ambiente Cadastrados */}
      <div className="pt-3 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" /> Perfis de Automação Cadastrados ({settings.automationProfiles?.length || 0})
          </span>
          <span className="text-2xs text-muted-foreground">
            Gerencie, adicione e edite passos na aba de Ambiente
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {(settings.automationProfiles || []).map((prof) => {
            const isActive = (settings.activeProfileId || settings.automationProfiles?.[0]?.id) === prof.id;
            return (
              <div
                key={prof.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isActive
                    ? 'border-primary/50 bg-primary/10 shadow-xs'
                    : 'border-border bg-card/60'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground truncate">{prof.name}</span>
                    {isActive && (
                      <span className="text-2xs bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground truncate mt-0.5">
                    {prof.description || `${prof.steps?.length || 0} passos configurados`}
                  </p>
                </div>
                <span className="text-2xs font-mono font-bold bg-muted px-2 py-1 rounded shrink-0">
                  {prof.steps?.length || 0} passos
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
