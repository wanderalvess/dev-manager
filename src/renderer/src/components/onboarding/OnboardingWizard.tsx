import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { AppSettings, PathStatusInfo } from '../../../../shared/types';
import { normalizeDisabledModules } from '../../../../shared/appModules';
import { Modal } from '../ui/Modal';
import { showToast } from '../ToastHost';
import { computeSetupChecklistStatus } from '../../utils/settingsListEditors';
import { pickDetectedPaths } from '../../utils/environmentPageUtils';
import { requestSettingsTab } from '../../utils/settingsDeepLink';
import { WELCOME_STORAGE_KEY } from './welcomeSteps';
import { ONBOARDING_STEPS, buildEnvSections } from './onboardingContent';
import { OnboardingSidebar } from './steps/OnboardingSidebar';
import { WelcomeStep } from './steps/WelcomeStep';
import { ModulesStep } from './steps/ModulesStep';
import { ThemeStep } from './steps/ThemeStep';
import { EnvStep } from './steps/EnvStep';
import { McpStep } from './steps/McpStep';
import { DoneStep } from './steps/DoneStep';

interface OnboardingWizardProps {
  isOpen: boolean;
  /** `wantsTour`: a pessoa escolheu fazer o tour guiado ao terminar. */
  onFinish: (wantsTour: boolean) => void;
  /** Chamado depois de salvar configurações (módulos, caminhos detectados) para o app reler. */
  onSettingsSaved: () => void;
  onOpenSettings: () => void;
  /** Abre o Assistente INFR em Primeiros passos (WSL, distro e INFR-Docker do zero) */
  onOpenInfrFirstSteps: () => void;
}

// Caminhos essenciais: se algum estiver vazio ao chegar na etapa Ambiente, a detecção roda sozinha uma vez.
const ESSENTIAL_PATH_KEYS = ['projectsPath', 'karafPath', 'intellijPath'] as const;

function markWelcomeDone(): void {
  try {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify({ done: true, ts: Date.now() }));
  } catch {
    // localStorage indisponível — o onboarding volta a aparecer na próxima abertura
  }
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onFinish, onSettingsSaved, onOpenSettings, onOpenInfrFirstSteps }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [modulesDirty, setModulesDirty] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [envIndex, setEnvIndex] = useState(0);
  const [mcpIndex, setMcpIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedKeys, setDetectedKeys] = useState<string[] | null>(null);
  const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatusInfo>>({});
  const autoDetected = useRef(false);

  const loadSettings = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.getSettings) return;
    try {
      const st = await api.getSettings();
      setSettings(st);
      setDisabledModules(normalizeDisabledModules(st.disabledModules));
      if (api.checkPath) {
        const entries = await Promise.all(
          ESSENTIAL_PATH_KEYS.map(async (k) => [k, st[k] ? await api.checkPath(st[k]).catch(() => undefined) : undefined] as const)
        );
        const next: Record<string, PathStatusInfo> = {};
        entries.forEach(([k, v]) => {
          if (v) next[k] = v;
        });
        setPathStatuses(next);
      }
    } catch (err) {
      console.warn('[Onboarding] Falha ao ler configurações:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
    setModulesDirty(false);
    setDetectedKeys(null);
    autoDetected.current = false;
    loadSettings();
  }, [isOpen, loadSettings]);

  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const envSections = useMemo(() => buildEnvSections(settings), [settings]);
  const checklist = useMemo(() => computeSetupChecklistStatus(settings ?? {}, pathStatuses), [settings, pathStatuses]);

  const persistModules = async () => {
    if (!modulesDirty || !window.electronAPI?.saveSettings) return;
    try {
      await window.electronAPI.saveSettings({ disabledModules });
      setModulesDirty(false);
      onSettingsSaved();
    } catch {
      showToast('Não foi possível salvar os módulos. Ajuste em Configurações → Módulos.', 'error');
    }
  };

  const finish = async (wantsTour: boolean) => {
    await persistModules();
    markWelcomeDone();
    onFinish(wantsTour);
  };

  const openSettings = async (section?: string) => {
    await persistModules();
    requestSettingsTab(section ?? 'overview');
    onOpenSettings();
  };

  const openInfrFirstSteps = async () => {
    await persistModules();
    onOpenInfrFirstSteps();
  };

  const goTo = (i: number) => {
    if (step.id === 'modules' && i !== stepIndex) void persistModules();
    setStepIndex(Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, i)));
  };

  /** `silent`: rodada automática ao entrar na etapa — só avisa quando encontrou algo ou falhou. */
  const detect = useCallback(
    async (silent: boolean) => {
      const api = window.electronAPI;
      if (!api?.autoDetectPaths || !api.saveSettings || !settings) return;
      setIsDetecting(true);
      try {
        const filled = pickDetectedPaths(settings, await api.autoDetectPaths());
        const keys = Object.keys(filled);
        if (keys.length > 0) {
          await api.saveSettings(filled);
          onSettingsSaved();
        }
        await loadSettings();
        setDetectedKeys(keys);
        if (keys.length > 0) showToast(`${keys.length} caminho(s) detectado(s) e salvo(s).`, 'success');
        else if (!silent) showToast('Nada novo para preencher: os campos já estavam configurados ou não foram encontrados.', 'info');
      } catch {
        showToast('A detecção automática falhou. Preencha em Configurações.', 'error');
      } finally {
        setIsDetecting(false);
      }
    },
    [settings, loadSettings, onSettingsSaved]
  );

  useEffect(() => {
    if (step.id !== 'env' || !settings || autoDetected.current) return;
    autoDetected.current = true;
    if (ESSENTIAL_PATH_KEYS.some((k) => !settings[k]?.trim())) void detect(true);
  }, [step.id, settings, detect]);

  let primaryLabel = 'Continuar';
  if (stepIndex === 0) primaryLabel = 'Vamos lá';
  if (isLast) primaryLabel = 'Começar a usar';

  return (
    <Modal
      open={isOpen}
      onClose={() => finish(false)}
      bare
      closeOnBackdrop={false}
      zIndexClass="z-10002"
      ariaLabel="Onboarding do Hub Manager"
      panelClassName="fixed inset-0 bg-background text-foreground overflow-hidden flex animate-welcome-overlay"
    >
      <OnboardingSidebar stepIndex={stepIndex} onGoTo={goTo} onFinishLater={() => finish(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <main key={step.id} className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-12 lg:px-20 pt-10 lg:pt-14 pb-8 flex flex-col gap-5 animate-onboarding-in">
          {step.id === 'welcome' && (
            <WelcomeStep
              onPickGroup={(i) => {
                setGroupIndex(i);
                goTo(1);
              }}
            />
          )}
          {step.id === 'modules' && (
            <ModulesStep
              disabledModules={disabledModules}
              onChange={(next) => {
                setDisabledModules(next);
                setModulesDirty(true);
              }}
              groupIndex={groupIndex}
              onGroupChange={setGroupIndex}
            />
          )}
          {step.id === 'theme' && <ThemeStep />}
          {step.id === 'env' && (
            <EnvStep
              sections={envSections}
              sectionIndex={envIndex}
              onSectionChange={setEnvIndex}
              checklist={checklist}
              detectedKeys={detectedKeys ?? []}
              hasDetected={detectedKeys !== null}
              isDetecting={isDetecting}
              onDetect={() => void detect(false)}
              onOpenSettings={(section) => void openSettings(section)}
              onOpenInfrFirstSteps={() => void openInfrFirstSteps()}
            />
          )}
          {step.id === 'mcp' && <McpStep exampleIndex={mcpIndex} onExampleChange={setMcpIndex} />}
          {step.id === 'done' && (
            <DoneStep disabledModules={disabledModules} checklist={checklist} onOpenSettings={() => void openSettings()} onStartTour={() => finish(true)} />
          )}
        </main>

        <footer className="shrink-0 h-22 px-6 sm:px-12 lg:px-20 flex items-center justify-between gap-3 border-t border-border">
          <button
            type="button"
            onClick={() => goTo(stepIndex - 1)}
            className={`h-12 px-5 rounded-xl border border-border font-semibold text-muted-foreground hover:text-foreground cursor-pointer ${stepIndex === 0 ? 'invisible' : ''}`}
          >
            Voltar
          </button>
          <span className="font-mono text-xs text-muted-foreground">
            {String(stepIndex + 1).padStart(2, '0')} / {String(ONBOARDING_STEPS.length).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={() => finish(false)}
                className="md:hidden h-12 px-4 rounded-xl font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Terminar depois
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish(false) : goTo(stepIndex + 1))}
              className="h-12 min-w-44 px-6 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              {primaryLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
};
