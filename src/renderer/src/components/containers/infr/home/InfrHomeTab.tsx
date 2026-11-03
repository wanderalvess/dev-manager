import React, { useState } from 'react';
import { Activity, Bot, GitBranchPlus, Plus, RotateCw, type LucideIcon } from 'lucide-react';
import type { InfrEnvironmentsResult } from '../../../../../../shared/infrWinthorVersion';
import type { InfrBootstrapTab } from '../../../../utils/infrBootstrapModalUtils';
import { showToast } from '../../../ToastHost';
import { InfrHomeEnvRow } from './InfrHomeEnvRow';

const TASKS: { tab: InfrBootstrapTab; icon: LucideIcon; title: string; text: string }[] = [
  { tab: 'newVersion', icon: GitBranchPlus, title: 'Nova versão', text: 'Copia um ambiente que funciona para outra versão do WinThor. A origem não muda.' },
  { tab: 'firstSteps', icon: Plus, title: 'Montar do zero', text: 'Do computador sem nada ao primeiro ambiente: WSL, distro, projeto e containers.' },
  { tab: 'verify', icon: Activity, title: 'Verificar', text: 'Por que um ambiente não subiu: estado, logs e testes de cada parte.' }
];

const PARTS: { tab: InfrBootstrapTab; label: string }[] = [
  { tab: 'oracle', label: 'banco' },
  { tab: 'wta', label: 'WTA' },
  { tab: 'wsh', label: 'WSH' }
];

/** Tela inicial do assistente: o pedido para a IA, as três tarefas e os ambientes da distro com o estado de cada parte. */
export const InfrHomeTab: React.FC<{
  envs: InfrEnvironmentsResult | null;
  loadingEnvs: boolean;
  onReload: () => void;
  distro?: string;
  onAsk: (goal: string) => void;
  onGoTo: (tab: InfrBootstrapTab) => void;
  onVerify: (name: string) => void;
  onCopy: (name: string) => void;
}> = ({ envs, loadingEnvs, onReload, distro, onAsk, onGoTo, onVerify, onCopy }) => {
  const [goal, setGoal] = useState('');
  const [starting, setStarting] = useState('');
  const list = envs?.environments ?? [];
  const example = `ex.: criar a versão 40 a partir do ${list[0]?.name ?? 'master'}, com o nome v40`;

  const ask = () => {
    if (goal.trim()) onAsk(goal.trim());
  };

  const start = async (name: string) => {
    const api = window.electronAPI;
    if (!api?.startInfrEnvironment) return showToast('Iniciar só funciona no aplicativo.', 'info');
    setStarting(name);
    try {
      const res = await api.startInfrEnvironment({ distro: distro || envs?.distro, name });
      if (!res.success) showToast(`Não subiu o ${name}: ${res.error || res.failed || 'erro desconhecido'}`, 'error');
      else if (res.notes.length) showToast(`${name}: ${res.notes[0]}`, 'info');
      else showToast(res.started.length ? `${name} no ar.` : `O ${name} já estava no ar.`, 'success');
    } finally {
      setStarting('');
      onReload();
    }
  };

  return (
    <div className="flex-1 min-w-0 overflow-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-5 md:px-6 py-8 space-y-8">
        <section aria-label="Pedir à IA" className="flex flex-col items-center text-center gap-2.5">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">O que você quer fazer?</h2>
          <p className="text-sm text-foreground/80">Escreva e a IA preenche a Nova versão. Ela confere tudo, mas quem cria o ambiente é você.</p>
          <div className="w-full max-w-2xl flex flex-wrap gap-2 mt-1.5">
            <label htmlFor="infr-ask" className="sr-only">
              Pedido para a IA
            </label>
            <input
              id="infr-ask"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder={example}
              className="flex-1 min-w-[16rem] h-11 px-4 rounded-xl border border-input bg-background text-sm text-foreground shadow-xs focus:outline-hidden focus:ring-2 focus:ring-warning/60"
            />
            <button
              type="button"
              onClick={ask}
              disabled={!goal.trim()}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-warning text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bot className="w-4 h-4" /> Conduzir
            </button>
          </div>
          <p className="text-2xs text-muted-foreground">Usa a chave de Configurações → IA &amp; LLM. Senhas e tokens são mascarados antes de ir ao modelo.</p>
        </section>

        <section aria-label="Tarefas" className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TASKS.map((t) => (
            <button
              key={t.tab}
              type="button"
              onClick={() => onGoTo(t.tab)}
              className="flex items-start gap-3 p-4 rounded-xl border border-border/80 bg-card text-left hover:border-warning/50 hover:bg-warning/5 transition cursor-pointer"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <t.icon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">{t.title}</span>
                <span className="block text-xs text-foreground/80 mt-1 leading-relaxed">{t.text}</span>
              </span>
            </button>
          ))}
        </section>

        <section aria-label="Seus ambientes" className="space-y-2.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-base font-bold text-foreground">Seus ambientes</h2>
            <span className="text-2xs text-muted-foreground">
              {loadingEnvs ? 'Lendo a distro...' : envs?.success ? `${list.length} na distro ${envs.distro ?? ''}` : ''}
            </span>
            <span className="flex-1" />
            <button type="button" onClick={onReload} className="inline-flex items-center gap-1.5 text-2xs font-semibold text-warning hover:underline cursor-pointer">
              <RotateCw className={`w-3 h-3 ${loadingEnvs ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
          {envs && !envs.success && <p className="text-sm text-danger p-3 rounded-xl border border-danger/40 bg-danger/5 break-words">{envs.error}</p>}
          {envs?.success && list.length === 0 && (
            <div className="p-5 rounded-xl border border-dashed border-border text-center space-y-3">
              <p className="text-sm text-foreground">Nenhum ambiente (oracle-, wta-, wsh-&lt;nome&gt;) nesta distro.</p>
              <button type="button" onClick={() => onGoTo('firstSteps')} className="h-9 px-4 rounded-lg bg-warning text-white text-xs font-semibold cursor-pointer">
                Montar do zero
              </button>
            </div>
          )}
          {list.length > 0 && (
            <ul className="rounded-xl border border-border/80 bg-card">
              {list.map((env) => (
                <InfrHomeEnvRow
                  key={env.name}
                  env={env}
                  starting={starting === env.name}
                  onStart={() => start(env.name)}
                  onVerify={() => onVerify(env.name)}
                  onCopy={() => onCopy(env.name)}
                  onOpenUrl={(url) => window.electronAPI?.openExternal?.(url)}
                />
              ))}
            </ul>
          )}
          <p className="text-2xs text-muted-foreground pt-1">
            Subir só uma parte de uma versão:{' '}
            {PARTS.map((p, i) => (
              <React.Fragment key={p.tab}>
                {i > 0 && ' · '}
                <button type="button" onClick={() => onGoTo(p.tab)} className="text-warning hover:underline cursor-pointer">
                  {p.label}
                </button>
              </React.Fragment>
            ))}
          </p>
        </section>
      </div>
    </div>
  );
};
