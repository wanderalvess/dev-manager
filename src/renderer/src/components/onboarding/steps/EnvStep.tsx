import React from 'react';
import { Check, Search } from 'lucide-react';
import type { SetupChecklistItemStatus } from '../../../utils/settingsListEditors';
import { sectionProgress, summarizeChecklist, type EnvSection } from '../onboardingContent';
import { Eyebrow, StepLead, StepTitle } from './stepUi';
import { PANEL, selectableRow } from './stepStyles';

interface EnvStepProps {
  sections: EnvSection[];
  sectionIndex: number;
  onSectionChange: (i: number) => void;
  checklist: SetupChecklistItemStatus[];
  /** Campos preenchidos pela última detecção, para marcar "detectado agora". */
  detectedKeys: string[];
  hasDetected: boolean;
  isDetecting: boolean;
  onDetect: () => void;
  onOpenSettings: () => void;
}

/** Etapa 4: os essenciais do checklist no topo e, embaixo, cada seção de Configurações com o que já está preenchido. */
export const EnvStep: React.FC<EnvStepProps> = ({
  sections,
  sectionIndex,
  onSectionChange,
  checklist,
  detectedKeys,
  hasDetected,
  isDetecting,
  onDetect,
  onOpenSettings
}) => {
  const section = sections[sectionIndex];
  const summary = summarizeChecklist(checklist);
  let detectLabel = hasDetected ? 'Detectar de novo' : 'Detectar automaticamente';
  if (isDetecting) detectLabel = 'Detectando…';

  return (
    <>
      <Eyebrow n={4}>AMBIENTE</Eyebrow>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <StepTitle>Deixa que eu encontro os caminhos.</StepTitle>
          <StepLead>A detecção preenche só o que estiver vazio. O que faltar, você completa aqui ou depois em Configurações.</StepLead>
        </div>
        <button
          type="button"
          onClick={onDetect}
          disabled={isDetecting}
          className="h-12 px-5 rounded-xl border border-primary bg-primary/10 text-foreground font-bold flex items-center gap-2.5 cursor-pointer hover:bg-primary/20 disabled:opacity-60 disabled:cursor-wait"
        >
          <Search className="w-4 h-4" /> {detectLabel}
        </button>
      </div>

      <section aria-label="Essenciais" className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold">Essenciais para decolar</span>
          <span className="font-mono text-sm text-muted-foreground">
            <span className="font-bold text-success">{summary.done}</span> de {summary.total} prontos
          </span>
        </div>
        <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
          {checklist.map((c) => (
            <li
              key={c.id}
              className={`min-h-12 px-3 rounded-xl border flex items-center gap-2.5 text-sm font-semibold ${
                c.done ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'
              }`}
            >
              {c.done ? (
                <Check className="w-4 h-4 shrink-0 text-success" strokeWidth={3} />
              ) : (
                <span aria-hidden="true" className="w-4 h-4 shrink-0 rounded-full border-2 border-dashed border-warning" />
              )}
              <span>
                {c.label}
                {!c.done && <span className="sr-only"> (pendente)</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col lg:flex-row gap-5">
        <div role="tablist" aria-label="Seções do ambiente" className="lg:w-64 shrink-0 flex flex-col gap-1">
          {sections.map((s, i) => (
            <button key={s.id} type="button" role="tab" aria-selected={i === sectionIndex} onClick={() => onSectionChange(i)} className={selectableRow(i === sectionIndex)}>
              <span className="flex-1 font-bold text-sm">{s.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{sectionProgress(s)}</span>
            </button>
          ))}
        </div>
        <section aria-label={section.title} className={`flex-1 min-w-0 ${PANEL}`}>
          {section.rows.map((r) => (
            <div key={r.label} className="min-h-16 px-5 py-3 flex items-center gap-4 border-b border-border/60 last:border-b-0">
              <span className="w-56 shrink-0 flex flex-col">
                <span className="font-bold text-sm">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.hint}</span>
              </span>
              <span className={`flex-1 min-w-0 truncate font-mono text-xs ${r.done ? 'text-foreground' : 'text-muted-foreground'}`} title={r.value}>
                {r.value || 'não configurado'}
              </span>
              {r.key && detectedKeys.includes(r.key) && (
                <span className="shrink-0 px-2.5 py-1 rounded-full border border-success/40 bg-success/10 text-xs font-semibold text-success">detectado agora</span>
              )}
              {!r.done && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="shrink-0 min-h-9 px-3.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Preencher
                </button>
              )}
            </div>
          ))}
        </section>
      </div>
    </>
  );
};
