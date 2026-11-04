import React, { useEffect, useState } from 'react';
import { CheckCircle2, PlugZap, RotateCw } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import { StartTabSelect } from '../../settings/appearance/StartTabSelect';
import { Eyebrow, StepLead, StepTitle } from './stepUi';
import { PANEL } from './stepStyles';
import { buildJiraSource, validateJiraForm, type JiraFormInput } from './startStepUtils';

interface StartStepProps {
  settings: AppSettings | null;
  disabledModules: string[];
  /** Depois de gravar: o wizard relê as configurações e avisa o app */
  onSaved: () => Promise<void> | void;
}

const INPUT = 'h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground w-full';
const LABEL = 'text-sm font-semibold';
const BUTTON = 'h-11 px-5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

type Status = { tone: 'ok' | 'error' | 'info'; text: string } | null;

/** Etapa Tela de início: ligar o Jira (a mesma fonte da Documentação) e escolher a aba aberta ao entrar no cockpit. */
export const StartStep: React.FC<StartStepProps> = ({ settings, disabledModules, onSaved }) => {
  const [form, setForm] = useState<JiraFormInput>({ baseUrl: '', token: '', projectKey: '' });
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);
  const [startTab, setStartTab] = useState(settings?.startTab ?? '');
  const existing = settings?.jiraSources?.find((s) => s.enabled && s.baseUrl);

  useEffect(() => setStartTab(settings?.startTab ?? ''), [settings?.startTab]);

  const set = (key: keyof JiraFormInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setStatus(null);
  };

  const run = async (kind: 'test' | 'save') => {
    const problem = validateJiraForm(form);
    if (problem) return setStatus({ tone: 'error', text: problem });
    const api = window.electronAPI;
    const source = buildJiraSource(form, `jira-${Date.now()}`);
    setBusy(kind);
    try {
      if (kind === 'test') {
        const r = await api?.testJiraConnection?.(source);
        setStatus(r ? { tone: r.success ? 'ok' : 'error', text: r.message } : { tone: 'error', text: 'Teste indisponível neste modo.' });
      } else {
        await api?.saveSettings?.({ jiraSources: [...(settings?.jiraSources ?? []), source] });
        setForm({ baseUrl: '', token: '', projectKey: '' });
        setStatus({ tone: 'ok', text: 'Jira ligado. A tela de início já mostra suas issues na próxima abertura.' });
        await onSaved();
      }
    } catch {
      setStatus({ tone: 'error', text: kind === 'test' ? 'Não consegui testar a conexão.' : 'Não consegui salvar. Tente em Documentação › Confluence & Jira.' });
    } finally {
      setBusy(null);
    }
  };

  const saveStartTab = async (tab: string) => {
    setStartTab(tab);
    await window.electronAPI?.saveSettings?.({ startTab: tab });
    await onSaved();
  };

  return (
    <>
      <Eyebrow n={5}>TELA DE INÍCIO</Eyebrow>
      <StepTitle>O seu dia, logo ao abrir.</StepTitle>
      <StepLead>
        A tela de início mostra os ambientes, a semana no Hub, o PC e o clima. Com o Jira ligado, mostra também onde você parou, suas issues em
        andamento, os prazos de hoje, a sprint e as horas lançadas. Sem Jira, ela traz seus módulos mais usados.
      </StepLead>

      <section aria-labelledby="start-jira-title" className={`${PANEL} p-6 flex flex-col gap-4 max-w-3xl`}>
        <h3 id="start-jira-title" className="m-0 text-lg font-extrabold flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-primary" /> Jira
        </h3>
        {existing ? (
          <p className="m-0 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>
              Já ligado: <strong>{existing.name}</strong> <span className="font-mono text-muted-foreground">{existing.baseUrl}</span>. Para trocar,
              use Documentação › Confluence &amp; Jira.
            </span>
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className={LABEL}>URL do Jira</span>
                <input value={form.baseUrl} onChange={set('baseUrl')} placeholder="https://jira.suaempresa.com" className={INPUT} autoComplete="off" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Token pessoal (PAT)</span>
                <input type="password" value={form.token} onChange={set('token')} className={INPUT} autoComplete="off" />
                <span className="text-xs text-muted-foreground">No Jira: seu perfil › Personal Access Tokens. Fica criptografado no Hub.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Chave do projeto (opcional)</span>
                <input value={form.projectKey} onChange={set('projectKey')} placeholder="ex.: PCV" className={INPUT} autoComplete="off" />
                <span className="text-xs text-muted-foreground">Também entra na busca de documentação. Vazio: só as suas issues.</span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void run('test')} disabled={!!busy} className={`${BUTTON} border border-border`}>
                {busy === 'test' && <RotateCw className="w-4 h-4 animate-spin" />} Testar conexão
              </button>
              <button type="button" onClick={() => void run('save')} disabled={!!busy} className={`${BUTTON} bg-primary text-primary-foreground`}>
                {busy === 'save' && <RotateCw className="w-4 h-4 animate-spin" />} Salvar Jira
              </button>
              <span className="text-xs text-muted-foreground">Pode pular: dá para ligar depois em Documentação › Confluence &amp; Jira.</span>
            </div>
          </>
        )}
        {status && (
          <p role="status" className={`m-0 text-sm ${status.tone === 'ok' ? 'text-success' : status.tone === 'error' ? 'text-danger' : 'text-muted-foreground'}`}>
            {status.text}
          </p>
        )}
      </section>

      <section aria-labelledby="start-tab-title" className={`${PANEL} p-6 flex flex-wrap items-center justify-between gap-4 max-w-3xl`}>
        <div className="min-w-0">
          <h3 id="start-tab-title" className="m-0 text-lg font-extrabold">
            <label htmlFor="onboarding-start-tab">Ao entrar no cockpit</label>
          </h3>
          <p className="m-0 mt-1 text-sm text-muted-foreground">Abrir numa aba fixa ou na última que você usou. Muda depois em Configurações › Aparência.</p>
        </div>
        <StartTabSelect id="onboarding-start-tab" value={startTab} onChange={(t) => void saveStartTab(t)} disabledModules={disabledModules} className="min-w-64" />
      </section>
    </>
  );
};
