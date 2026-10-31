import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { SETTINGS_TOUR_STEPS, SETTINGS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/settingsTour';
import type { SettingsTab } from '../components/settings/settingsSections';
import { SettingsSectionNav } from '../components/settings/SettingsSectionNav';
import { SettingsSectionHeader } from '../components/settings/SettingsSectionHeader';
import { SettingsSectionContent } from '../components/settings/SettingsSectionContent';
import { SettingsSaveBar } from '../components/settings/SettingsSaveBar';
import { SettingsSearchBar } from '../components/settings/SettingsSearchBar';
import { useSettingsDraft } from '../hooks/settings/useSettingsDraft';
import { usePathValidation } from '../hooks/settings/usePathValidation';
import { useLauncherRows } from '../hooks/settings/useLauncherRows';
import { useTrackedLists } from '../hooks/settings/useTrackedLists';
import { useLlmProviders } from '../hooks/settings/useLlmProviders';
import { useQualitySources } from '../hooks/settings/useQualitySources';
import { useEnvironmentProfiles } from '../hooks/settings/useEnvironmentProfiles';
import { useSettingsImportExport } from '../hooks/settings/useSettingsImportExport';
import { useSettingsSearch } from '../hooks/settings/useSettingsSearch';
import { useSetupChecklist } from '../hooks/settings/useSetupChecklist';
import { computeSectionStatuses } from '../utils/settingsSectionStatus';
import { clearPendingSettingsTab, onSettingsTabRequested, peekPendingSettingsTab } from '../utils/settingsDeepLink';

interface SettingsPageProps {
  onSettingsSaved?: () => void;
  onNavigate?: (tab: string) => void;
}

const BANNER_BASE = 'px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0';

/**
 * Orquestra a tela de Configurações: menu lateral de seções à esquerda, a seção ativa à direita e uma barra de salvar
 * única no rodapé. O estado e as regras vivem nos hooks de `hooks/settings`; cada seção monta as abas de
 * `components/settings/tabs` em `SettingsSectionContent`.
 */
export const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsSaved, onNavigate }) => {
  const tour = usePageTour(SETTINGS_TOUR_STORAGE_KEY);
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => peekPendingSettingsTab() ?? 'overview');
  useEffect(() => {
    clearPendingSettingsTab();
    return onSettingsTabRequested(setActiveTab);
  }, []);

  const draft = useSettingsDraft(onSettingsSaved);
  const { settings, setSettings, loadedSettings } = draft;
  const paths = usePathValidation(settings, setSettings);
  const launcher = useLauncherRows(setSettings);
  const lists = useTrackedLists(settings, setSettings);
  const llm = useLlmProviders(setSettings);
  const quality = useQualitySources(setSettings);
  const envProfiles = useEnvironmentProfiles(settings, setSettings, paths.validateAllPaths);
  const importExport = useSettingsImportExport(draft.reload, onSettingsSaved);
  const search = useSettingsSearch(activeTab, setActiveTab);
  const setup = useSetupChecklist(settings, paths.pathStatuses, setActiveTab, onNavigate);
  const statuses = useMemo(() => computeSectionStatuses(setup.checklist, settings), [setup.checklist, settings]);

  // A cada (re)carga do disco: valida os caminhos e remonta o editor de launchers a partir do que foi salvo
  const { validateAllPaths } = paths;
  const { resetRows } = launcher;
  useEffect(() => {
    if (!loadedSettings) return;
    resetRows(loadedSettings.routineLauncherMap);
    void validateAllPaths(loadedSettings);
  }, [loadedSettings, resetRows, validateAllPaths]);

  // Trocar de seção volta o conteúdo ao topo (a busca rola até o campo depois disso)
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  const handleAutoDetect = async () => {
    await paths.handleAutoDetect();
    setActiveTab('dirs');
  };
  const showDetect = activeTab === 'overview' || activeTab === 'dirs';

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-4 md:gap-6 px-4 py-3 md:px-5 md:py-4 overflow-hidden">
      <SettingsSectionNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        statuses={statuses}
        onOpenTour={tour.open}
        search={
          <SettingsSearchBar
            query={search.query}
            onQueryChange={search.setQuery}
            isOpen={search.isOpen}
            onOpenChange={search.setIsOpen}
            results={search.results}
            onSelectResult={search.selectResult}
          />
        }
      />

      <div ref={contentRef} className="flex-1 min-w-0 min-h-0 overflow-y-auto pr-1 -mr-1">
        <div className="max-w-5xl flex flex-col gap-4 min-h-full">
          <SettingsSectionHeader
            tab={activeTab}
            actions={
              showDetect && (
                <button
                  data-tour="auto-detect-button"
                  type="button"
                  onClick={() => void handleAutoDetect()}
                  disabled={paths.isDetecting}
                  className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-primary ${paths.isDetecting ? 'animate-pulse' : ''}`} />
                  {paths.isDetecting ? 'Detectando…' : activeTab === 'dirs' ? 'Detectar de novo' : 'Detectar caminhos'}
                </button>
              )
            }
          />

          {importExport.statusMessage && (
            <div role="status" className={`${BANNER_BASE} bg-success/10 border-success/30 text-success`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importExport.statusMessage}</span>
            </div>
          )}

          {draft.saveError && (
            <div role="alert" className={`${BANNER_BASE} bg-danger/10 border-danger/30 text-danger`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Não foi possível salvar as configurações: {draft.saveError}</span>
            </div>
          )}

          <div className="flex-1">
            <SettingsSectionContent
              tab={activeTab}
              settings={settings}
              setSettings={setSettings}
              paths={paths}
              launcher={launcher}
              lists={lists}
              llm={llm}
              quality={quality}
              envProfiles={envProfiles}
              importExport={importExport}
              setup={setup}
              statuses={statuses}
              onOpenSection={setActiveTab}
              onNavigate={onNavigate}
            />
          </div>

          <SettingsSaveBar
            changedCount={draft.changedCount}
            isSaving={draft.isSaving}
            savedSuccess={draft.savedSuccess}
            onDiscard={draft.discard}
            onSave={() => void draft.handleSave()}
          />
        </div>
      </div>

      <OnboardingTour
        steps={SETTINGS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={SETTINGS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
