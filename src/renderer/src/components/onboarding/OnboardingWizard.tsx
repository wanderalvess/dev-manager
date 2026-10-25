import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, PlayCircle, Search, Settings } from 'lucide-react';
import type { AppSettings, PathStatusInfo } from '../../../../shared/types';
import { APP_MODULE_IDS, normalizeDisabledModules } from '../../../../shared/appModules';
import { NAV_THEME_GROUPS } from '../header/headerNavConfig';
import { AppLogo } from '../AppLogo';
import { Modal } from '../ui/Modal';
import { showToast } from '../ToastHost';
import { useTheme } from '../../context/ThemeContext';
import { computeSetupChecklistStatus } from '../../utils/settingsListEditors';
import { pickDetectedPaths } from '../../utils/environmentPageUtils';
import { WELCOME_STORAGE_KEY } from './welcomeSteps';
import {
  MCP_EXAMPLES,
  ONBOARDING_STEPS,
  ONBOARDING_THEMES,
  buildEnvSections,
  toggleDisabledModule
} from './onboardingContent';

interface OnboardingWizardProps {
  isOpen: boolean;
  /** `wantsTour`: a pessoa escolheu fazer o tour guiado ao terminar. */
  onFinish: (wantsTour: boolean) => void;
  /** Chamado depois de salvar configurações (módulos, caminhos detectados) para o app reler. */
  onSettingsSaved: () => void;
  onOpenSettings: () => void;
}

const CHECKLIST_HINTS: Record<string, string> = {
  dirs: 'Onde ficam seus projetos e o servidor Karaf.',
  ide: 'Para abrir o workspace certo pelo cockpit.',
  'karaf-creds': 'Usuário e senha para o console e o SSH.',
  database: 'Oracle, Postgres ou MySQL para o SQL runner e os backups.'
};

function markWelcomeDone(): void {
  try {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify({ done: true, ts: Date.now() }));
  } catch {
    // localStorage indisponível — o onboarding volta a aparecer na próxima abertura
  }
}

const Eyebrow: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <span className="font-mono text-xs font-bold tracking-[0.14em] text-primary">
    ETAPA {String(n).padStart(2, '0')} · {children}
  </span>
);

const pill = (active: boolean): string =>
  `h-10 px-4 rounded-full text-sm font-semibold cursor-pointer transition-colors border ${
    active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
  }`;

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onFinish, onSettingsSaved, onOpenSettings }) => {
  const { mode, setMode, variant, setVariant } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [modulesDirty, setModulesDirty] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [envIndex, setEnvIndex] = useState(0);
  const [mcpIndex, setMcpIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatusInfo>>({});

  const loadSettings = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.getSettings) return;
    try {
      const st = await api.getSettings();
      setSettings(st);
      setDisabledModules(normalizeDisabledModules(st.disabledModules));
      if (api.checkPath) {
        const keys = ['projectsPath', 'karafPath', 'intellijPath'] as const;
        const entries = await Promise.all(
          keys.map(async (k) => [k, st[k] ? await api.checkPath(st[k]).catch(() => undefined) : undefined] as const)
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
    loadSettings();
  }, [isOpen, loadSettings]);

  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const enabledCount = APP_MODULE_IDS.length - disabledModules.length;
  const envSections = useMemo(() => buildEnvSections(settings), [settings]);
  const checklist = useMemo(
    () => (settings ? computeSetupChecklistStatus(settings, pathStatuses) : []),
    [settings, pathStatuses]
  );

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

  const goTo = (i: number) => {
    if (ONBOARDING_STEPS[stepIndex].id === 'modules' && i !== stepIndex) void persistModules();
    setStepIndex(Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, i)));
  };

  const detect = async () => {
    const api = window.electronAPI;
    if (!api?.autoDetectPaths || !api.saveSettings || !settings) return;
    setIsDetecting(true);
    try {
      const filled = pickDetectedPaths(settings, await api.autoDetectPaths());
      const n = Object.keys(filled).length;
      if (n > 0) {
        await api.saveSettings(filled);
        onSettingsSaved();
      }
      await loadSettings();
      showToast(n > 0 ? `${n} caminho(s) detectado(s) e salvo(s).` : 'Nada novo para preencher: os campos já estavam configurados ou não foram encontrados.', n > 0 ? 'success' : 'info');
    } catch {
      showToast('A detecção automática falhou. Preencha em Configurações.', 'error');
    } finally {
      setIsDetecting(false);
    }
  };

  const group = NAV_THEME_GROUPS[groupIndex];
  const env = envSections[envIndex];
  const mcp = MCP_EXAMPLES[mcpIndex];
  const pct = Math.round((stepIndex / (ONBOARDING_STEPS.length - 1)) * 100);

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
      <aside className="hidden md:flex w-72 shrink-0 flex-col gap-8 border-r border-border bg-card p-7">
        <div className="flex items-center gap-3">
          <AppLogo size="sm" />
          <div className="flex flex-col">
            <span className="font-extrabold text-base">Hub Manager</span>
            <span className="font-mono text-2xs text-muted-foreground">ecossistema WinThor</span>
          </div>
        </div>
        <nav aria-label="Etapas do onboarding" className="flex flex-col gap-1">
          {ONBOARDING_STEPS.map((s, i) => {
            const active = i === stepIndex;
            const done = i < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors ${
                  active ? 'bg-muted text-foreground' : done ? 'text-foreground hover:bg-muted/60' : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                    active ? 'bg-primary text-primary-foreground' : done ? 'bg-primary/15 text-primary' : 'border border-border'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-2xs text-muted-foreground">{s.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex justify-between font-mono text-2xs text-muted-foreground">
            <span>progresso</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col px-6 sm:px-12 lg:px-16 pt-10 pb-6">
        <div key={step.id} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 animate-onboarding-in">
          {step.id === 'welcome' && (
            <>
              <span className="font-mono text-xs font-bold tracking-[0.14em] text-primary">PRAZER, EU SOU</span>
              <h1 className="m-0 text-5xl lg:text-7xl font-extrabold tracking-tighter leading-none">
                O seu <span className="text-primary">Hub Manager</span>.
              </h1>
              <p className="m-0 max-w-2xl text-base lg:text-lg text-muted-foreground leading-relaxed">
                Cockpit integrado de Operação, Desenvolvimento e Qualidade para o ecossistema WinThor. Ambiente, bancos, deploy, Git,
                rotinas, documentação e homologação — num só lugar.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                {NAV_THEME_GROUPS.map((g, i) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGroupIndex(i);
                        goTo(1);
                      }}
                      className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/50"
                    >
                      <span className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="font-mono text-2xs tracking-widest text-muted-foreground">{g.compactTitle.toUpperCase()}</span>
                      <span className="font-bold leading-tight">{g.title}</span>
                      <span className="text-xs text-muted-foreground">{g.items.length} páginas</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step.id === 'modules' && (
            <>
              <Eyebrow n={2}>MÓDULOS</Eyebrow>
              <h2 className="m-0 text-4xl font-extrabold tracking-tight">Ligue só o que você usa.</h2>
              <p className="m-0 text-muted-foreground">
                {enabledCount} de {APP_MODULE_IDS.length} módulos ligados. Os desligados somem do menu lateral, da busca e dos atalhos — dá pra
                mudar em Configurações → Módulos.
              </p>
              <div role="tablist" aria-label="Grupos de navegação" className="flex flex-wrap gap-2">
                {NAV_THEME_GROUPS.map((g, i) => (
                  <button key={g.id} type="button" role="tab" aria-selected={i === groupIndex} onClick={() => setGroupIndex(i)} className={pill(i === groupIndex)}>
                    {g.title}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {group.items.map((item) => {
                  const on = !disabledModules.includes(item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-b-0">
                      <span className="w-48 shrink-0 font-bold">{item.label}</span>
                      <span className="flex-1 text-sm text-muted-foreground">{item.description}</span>
                      <span className={`hidden sm:inline min-w-14 text-center font-mono text-xs px-2 py-1 rounded-md ${item.shortcut ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
                        {item.shortcut ?? '—'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`Ligar ${item.label}`}
                        onClick={() => {
                          setDisabledModules((d) => toggleDisabledModule(d, item.id, APP_MODULE_IDS.length));
                          setModulesDirty(true);
                        }}
                        className={`relative w-12 h-7 shrink-0 rounded-full cursor-pointer transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-background transition-[left] ${on ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step.id === 'theme' && (
            <>
              <Eyebrow n={3}>TEMA</Eyebrow>
              <h2 className="m-0 text-4xl font-extrabold tracking-tight">Deixe o cockpit com a sua cara.</h2>
              <p className="m-0 text-muted-foreground">Clique para ver ao vivo. Dá pra trocar depois pelo cabeçalho.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('dark')} className={pill(mode === 'dark')}>
                  Escuro
                </button>
                <button type="button" onClick={() => setMode('light')} className={pill(mode === 'light')}>
                  Claro
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {ONBOARDING_THEMES.map((t) => {
                  const on = t.id === variant;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setVariant(t.id)}
                      className={`flex flex-col gap-3 rounded-2xl bg-card p-3 text-left cursor-pointer transition-all hover:-translate-y-0.5 ${
                        on ? 'border-2 border-primary' : 'border border-border'
                      }`}
                    >
                      <span className="h-28 rounded-xl p-3 flex flex-col gap-2" style={{ background: t.bg }}>
                        <span className="h-2.5 w-3/5 rounded" style={{ background: t.accent }} />
                        <span className="h-8 rounded-md" style={{ background: t.card }} />
                        <span className="h-2 w-2/5 rounded bg-muted-foreground/30" />
                      </span>
                      <span className="font-bold text-sm">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step.id === 'env' && (
            <>
              <Eyebrow n={4}>AMBIENTE</Eyebrow>
              <h2 className="m-0 text-4xl font-extrabold tracking-tight">Deixa que eu encontro os caminhos.</h2>
              <p className="m-0 text-muted-foreground max-w-2xl">
                A detecção automática preenche só o que estiver vazio. O resto você ajusta nas mesmas abas de Configurações.
              </p>
              <div role="tablist" aria-label="Seções do ambiente" className="flex flex-wrap gap-2">
                {envSections.map((s, i) => (
                  <button key={s.id} type="button" role="tab" aria-selected={i === envIndex} onClick={() => setEnvIndex(i)} className={pill(i === envIndex)}>
                    {s.title}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {env.rows.map((r) => (
                  <div key={r.label} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/60 last:border-b-0">
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${r.done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}
                    >
                      {r.done ? <Check className="w-3.5 h-3.5" /> : '•'}
                    </span>
                    <span className="w-64 shrink-0 flex flex-col">
                      <span className="font-bold text-sm">{r.label}</span>
                      <span className="text-2xs text-muted-foreground">{r.hint}</span>
                    </span>
                    <span className={`flex-1 min-w-0 truncate font-mono text-xs ${r.done ? 'text-foreground' : 'text-muted-foreground'}`} title={r.value}>
                      {r.value || 'não configurado'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={detect}
                  disabled={isDetecting}
                  className="h-11 px-5 rounded-xl border border-border bg-card font-bold text-sm flex items-center gap-2 cursor-pointer hover:border-primary/50 disabled:opacity-60 disabled:cursor-wait"
                >
                  <Search className="w-4 h-4" />
                  {isDetecting ? 'Detectando…' : 'Detectar automaticamente'}
                </button>
                <button type="button" onClick={onOpenSettings} className="h-11 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" /> Abrir Configurações
                </button>
              </div>
            </>
          )}

          {step.id === 'checklist' && (
            <>
              <Eyebrow n={5}>CHECKLIST</Eyebrow>
              <h2 className="m-0 text-4xl font-extrabold tracking-tight">{checklist.length || 5} itens e você decola.</h2>
              <p className="m-0 text-muted-foreground">
                {checklist.filter((c) => c.done).length} de {checklist.length || 5} concluídos. Pode pular — o checklist fica em Configurações.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {checklist.map((c) => (
                  <div key={c.id} className={`flex items-start gap-4 rounded-2xl p-5 border ${c.done ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                    <span
                      className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${c.done ? 'bg-primary text-primary-foreground' : 'border-2 border-border'}`}
                    >
                      {c.done && <Check className="w-4 h-4" />}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="font-bold">{c.label}</span>
                      <span className="text-sm text-muted-foreground">{CHECKLIST_HINTS[c.id] ?? ''}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step.id === 'mcp' && (
            <>
              <Eyebrow n={6}>IA &amp; MCP</Eyebrow>
              <h2 className="m-0 text-4xl font-extrabold tracking-tight max-w-3xl">Seus agentes de IA também pilotam o cockpit.</h2>
              <p className="m-0 text-muted-foreground max-w-3xl">
                O servidor MCP embutido expõe o Hub Manager ao Claude Code e a outros assistentes. Você pede em linguagem natural, o agente
                executa. Clique num exemplo — e veja o estado de todas as integrações na tela Integrações, no fim do menu lateral:
              </p>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="lg:w-80 shrink-0 flex flex-col gap-2">
                  {MCP_EXAMPLES.map((m, i) => (
                    <button
                      key={m.ask}
                      type="button"
                      aria-pressed={i === mcpIndex}
                      onClick={() => setMcpIndex(i)}
                      className={`min-h-11 px-3.5 rounded-xl text-left text-sm font-semibold flex items-center gap-2.5 cursor-pointer border transition-colors ${
                        i === mcpIndex ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${i === mcpIndex ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                      {m.ask}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 font-mono text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" /> agente · conectado ao Hub Manager via MCP
                  </div>
                  <div className="text-muted-foreground">você</div>
                  <div className="font-sans text-base font-semibold">“{mcp.ask}”</div>
                  <div className="text-muted-foreground">agente chama</div>
                  <div className="flex flex-col items-start gap-2">
                    {mcp.tools.map((t) => (
                      <span key={t} className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary font-semibold">
                        ▸ {t}
                      </span>
                    ))}
                  </div>
                  <div className="text-muted-foreground">resultado</div>
                  <div className="font-sans text-sm">{mcp.result}</div>
                </div>
              </div>
            </>
          )}

          {step.id === 'done' && (
            <div className="flex flex-col items-start gap-6 pt-4">
              <div className="w-20 h-20 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_0_12px_hsl(var(--primary)/0.12)]">
                <Check className="w-10 h-10" strokeWidth={2.6} />
              </div>
              <h2 className="m-0 text-5xl lg:text-6xl font-extrabold tracking-tighter leading-none">
                Tudo pronto.
                <br />
                Bom trabalho por aqui.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
                {[
                  ['Ctrl+K', 'Busca rápida em qualquer tela'],
                  ['Alt+1 … Alt+0', 'Pule direto para cada página'],
                  ['Integrações', 'MCP, LLM, Azure e outras, no fim do menu'], ['Central de Ajuda', 'Refaça o tour quando quiser']
                ].map(([k, d]) => (
                  <div key={k} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{k}</span>
                    <span className="text-sm text-muted-foreground">{d}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => finish(true)} className="min-h-11 text-primary font-semibold flex items-center gap-2 cursor-pointer hover:underline">
                <PlayCircle className="w-5 h-5" /> Fazer o tour guiado
              </button>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 pt-5 border-t border-border">
          <button
            type="button"
            onClick={() => goTo(stepIndex - 1)}
            className={`h-11 px-5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer ${stepIndex === 0 ? 'invisible' : ''}`}
          >
            Voltar
          </button>
          <span className="font-mono text-xs text-muted-foreground">
            {String(stepIndex + 1).padStart(2, '0')} / {String(ONBOARDING_STEPS.length).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-2">
            {!isLast && (
              <button type="button" onClick={() => finish(false)} className="h-11 px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                Pular
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish(false) : goTo(stepIndex + 1))}
              className="h-11 min-w-40 px-6 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              {isLast ? 'Começar a usar' : stepIndex === 0 ? 'Vamos lá' : 'Continuar'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </main>
    </Modal>
  );
};
