import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Database, Globe, ImageIcon, ListOrdered, StickyNote, Trash2, X } from 'lucide-react';
import { RESULT_LABEL, type EvidenceAction, type EvidenceBlockKind, type EvidenceResult, type EvidenceStep } from '../../../../shared/evidenceTypes';
import { StepActions } from './StepActions';
import { StepBlocks, type ApiSuggestion, type ComposeRequest, type StepBlocksApi } from './StepBlocks';
import { StepImage, type StepImageProps } from './StepImage';
import type { EvidenceStepPatch } from '../../../../preload/evidenceApi';

const INPUT = 'h-10 px-3 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full';
const TEXTAREA = 'px-3 py-2 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full resize-y';
const LABEL = 'text-xs font-medium text-muted-foreground';
const STEP_BORDER: Record<EvidenceResult, string> = { pending: 'border-l-border', passed: 'border-l-green-600', failed: 'border-l-red-600' };
const CHIP_ON: Record<EvidenceResult, string> = { pending: 'bg-muted text-foreground', passed: 'bg-green-600 text-white', failed: 'bg-red-600 text-white' };
const PROOF_BTN =
  'h-9 px-3 border border-border rounded-[10px] bg-card hover:bg-muted text-sm font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer';

const RESULTS = Object.keys(RESULT_LABEL) as EvidenceResult[];

/** Seletor de resultado em três botões: o resultado é a decisão principal do passo e não deve ficar escondida num menu. */
const ResultChips: React.FC<{ value: EvidenceResult; onChange: (r: EvidenceResult) => void }> = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Resultado do passo" className="inline-flex shrink-0 rounded-[10px] border border-border bg-card p-0.5">
    {RESULTS.map((r) => (
      <button
        key={r}
        type="button"
        role="radio"
        aria-checked={value === r}
        className={`px-2.5 h-8 rounded-[8px] text-xs font-medium transition-colors cursor-pointer ${value === r ? CHIP_ON[r] : 'text-muted-foreground hover:bg-muted'}`}
        onClick={() => value !== r && onChange(r)}
      >
        {RESULT_LABEL[r]}
      </button>
    ))}
  </div>
);

/** Aparece logo depois do print: o passo já tem a imagem, então só falta decidir se um dado (API/SQL) também prova o resultado. */
const AfterCapturePrompt: React.FC<{ hasShot: boolean; hasLastApi: boolean; onPick: (kind: EvidenceBlockKind) => void; onSkip: () => void }> = ({ hasShot, hasLastApi, onPick, onSkip }) => (
  <div className="rounded-[10px] border border-primary/30 bg-primary/5 p-3 space-y-2.5">
    <div className="flex items-start gap-2">
      <Check className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{hasShot ? 'Print salvo neste passo.' : 'Passo criado.'}</p>
        <p className="text-xs text-muted-foreground">Quer provar também com um dado? A resposta da API ou o resultado do SQL entra no relatório junto do print.</p>
      </div>
      <button type="button" title="Dispensar" className="p-1 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" onClick={onSkip}>
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={PROOF_BTN} onClick={() => onPick('api')}>
        <Globe className="w-4 h-4" /> Chamar uma API{hasLastApi ? ' (repete a última)' : ''}
      </button>
      <button type="button" className={PROOF_BTN} onClick={() => onPick('sql')}>
        <Database className="w-4 h-4" /> Consultar o banco
      </button>
      <button type="button" className={PROOF_BTN} onClick={() => onPick('text')}>
        <StickyNote className="w-4 h-4" /> Colar texto
      </button>
      <button type="button" className="h-9 px-3 rounded-[10px] text-sm text-muted-foreground hover:text-foreground cursor-pointer" onClick={onSkip}>
        Só o print basta
      </button>
    </div>
  </div>
);

/** O que fazer logo depois de um print: perguntar (convite), abrir direto a prova de API, ou não sugerir nada. */
export type AfterCaptureMode = 'ask' | 'api' | 'off';

export interface StepCardProps {
  afterCapture: AfterCaptureMode;
  step: EvidenceStep;
  index: number;
  sessionId: string;
  /** Passo acabou de ser criado: abre expandido e oferece complementar com API/SQL. */
  fresh: boolean;
  /** Durante a gravação de cliques cada clique cria um passo; o convite só atrapalharia. */
  suppressPrompt: boolean;
  suggestion?: ApiSuggestion;
  image: Omit<StepImageProps, 'name' | 'sessionId' | 'marker'>;
  blocksApi: StepBlocksApi;
  onDismissFresh: () => void;
  onUpdate: (patch: EvidenceStepPatch) => void;
  onDelete: () => void;
  onSetActions: (actions: EvidenceAction[]) => void;
}

export const StepCard: React.FC<StepCardProps> = ({ afterCapture, step, index, sessionId, fresh, suppressPrompt, suggestion, image, blocksApi, onDismissFresh, onUpdate, onDelete, onSetActions }) => {
  const [open, setOpen] = useState(fresh);
  const [request, setRequest] = useState<ComposeRequest | null>(null);
  const blocks = step.blocks ?? [];
  const actions = step.actions ?? [];
  const eligible = fresh && !suppressPrompt && blocks.length === 0;
  const showPrompt = eligible && afterCapture === 'ask';

  const pick = (kind: EvidenceBlockKind) => {
    setRequest({ kind, n: Date.now() });
    onDismissFresh();
  };

  useEffect(() => {
    if (fresh) setOpen(true);
  }, [fresh]);

  useEffect(() => {
    if (eligible && afterCapture === 'api') pick('api');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, afterCapture]);

  return (
    <li className={`border border-border rounded-[14px] bg-card shadow-xs border-l-4 ${STEP_BORDER[step.result]} ${fresh ? 'ring-2 ring-primary/30' : ''}`}>
      <div className="flex items-center gap-2 p-3">
        <button type="button" title={open ? 'Recolher passo' : 'Expandir passo'} className="shrink-0 p-1 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="shrink-0 w-7 h-7 rounded-full bg-muted text-xs font-semibold text-foreground flex items-center justify-center">{index + 1}</span>
        <input
          className={INPUT}
          defaultValue={step.title}
          aria-label={`Título do passo ${index + 1}`}
          onBlur={(e) => e.target.value !== step.title && onUpdate({ title: e.target.value })}
        />
        {!open && (
          <span className="hidden md:flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {step.screenshot && (
              <span className="inline-flex items-center gap-1" title="Tem print">
                <ImageIcon className="w-3.5 h-3.5" />
              </span>
            )}
            {blocks.length > 0 && (
              <span className="inline-flex items-center gap-1" title="Provas de API, SQL ou texto">
                <Globe className="w-3.5 h-3.5" /> {blocks.length}
              </span>
            )}
            {actions.length > 0 && (
              <span className="inline-flex items-center gap-1" title="Ações no roteiro de reexecução">
                <ListOrdered className="w-3.5 h-3.5" /> {actions.length}
              </span>
            )}
          </span>
        )}
        <ResultChips value={step.result} onChange={(result) => onUpdate({ result })} />
        <button type="button" title="Excluir passo" className="shrink-0 p-2 rounded-[10px] text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          {step.screenshot && <StepImage {...image} name={step.screenshot} sessionId={sessionId} marker={step.marker} />}

          {showPrompt && <AfterCapturePrompt hasShot={!!step.screenshot} hasLastApi={!!suggestion} onPick={pick} onSkip={onDismissFresh} />}

          <section className="space-y-2">
            <div className={LABEL}>Provas (API, SQL, texto)</div>
            <StepBlocks blocks={step.blocks} api={blocksApi} openRequest={request} suggestion={suggestion} />
          </section>

          <section className="space-y-2">
            <div className={LABEL}>Resultado do teste</div>
            <div className="grid gap-2 md:grid-cols-2">
              <textarea className={TEXTAREA} rows={2} placeholder="O que era esperado" defaultValue={step.expected ?? ''} onBlur={(e) => e.target.value !== (step.expected ?? '') && onUpdate({ expected: e.target.value })} />
              <textarea className={TEXTAREA} rows={2} placeholder="O que aconteceu" defaultValue={step.actual ?? ''} onBlur={(e) => e.target.value !== (step.actual ?? '') && onUpdate({ actual: e.target.value })} />
            </div>
          </section>

          <details className="rounded-[10px] border border-border/70 bg-muted/20">
            <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ListOrdered className="w-3.5 h-3.5" />
              Roteiro de reexecução {actions.length > 0 ? `(${actions.length} ${actions.length === 1 ? 'ação' : 'ações'})` : '(opcional)'}
            </summary>
            <div className="px-3 pb-3">
              <StepActions actions={step.actions} onChange={onSetActions} />
            </div>
          </details>
        </div>
      )}
    </li>
  );
};
