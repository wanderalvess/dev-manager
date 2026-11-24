import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { EvidenceKind, EvidenceSession, EvidenceSessionInput } from '../../../../shared/evidenceTypes';
import { LinksEditor } from './LinksEditor';

const INPUT = 'h-10 px-3 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full';
const TEXTAREA = 'px-3 py-2 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full resize-y';
const LABEL = 'text-xs font-medium text-muted-foreground';

/**
 * Os dados informados ao iniciar a evidência (tarefa, título, tipo, responsável, ambiente) continuam editáveis.
 * Cada campo grava ao sair dele; o resumo na linha fechada mostra o que está valendo.
 */
export const SessionDetails: React.FC<{ session: EvidenceSession; onUpdate: (patch: Partial<EvidenceSessionInput>) => void }> = ({ session, onUpdate }) => {
  const commit = (field: 'task' | 'title' | 'tester' | 'environment', current: string | undefined) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.value.trim() !== (current ?? '')) onUpdate({ [field]: e.target.value });
  };
  const linkCount = session.links?.length ?? 0;
  const summary = [session.task, session.kind === 'qa' ? 'Teste (QA)' : 'Desenvolvimento', session.tester, session.environment?.split('\n')[0], linkCount > 0 && `${linkCount} ${linkCount === 1 ? 'link' : 'links'}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <details className="group rounded-[10px] border border-border/70 bg-muted/20">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
        <span className="shrink-0">Dados da evidência</span>
        <span className="truncate font-normal">{summary}</span>
      </summary>
      {/* key: ao trocar de sessão os campos recomeçam com os valores dela */}
      <div key={session.id} className="grid gap-3 px-3 pb-3 pt-1 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LABEL}>Tarefa (Jira, opcional)</label>
          <input className={INPUT} defaultValue={session.task} placeholder="Ex.: WT-123 (exigida só para publicar)" onBlur={commit('task', session.task)} />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Título</label>
          <input className={INPUT} defaultValue={session.title} onBlur={commit('title', session.title)} />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Tipo</label>
          <select className={INPUT} value={session.kind} onChange={(e) => onUpdate({ kind: e.target.value as EvidenceKind })}>
            <option value="qa">Teste (QA)</option>
            <option value="dev">Desenvolvimento</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Responsável</label>
          <input className={INPUT} defaultValue={session.tester ?? ''} placeholder="Nome" onBlur={commit('tester', session.tester)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className={LABEL}>Ambiente</label>
          <textarea className={TEXTAREA} rows={2} defaultValue={session.environment ?? ''} placeholder="Versão / branch / banco" onBlur={commit('environment', session.environment)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className={LABEL}>Links (opcional): PR das versões, vídeos, URL da API</label>
          <LinksEditor links={session.links} onChange={(links) => onUpdate({ links })} />
        </div>
      </div>
    </details>
  );
};
