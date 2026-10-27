import React, { useMemo, useState } from 'react';
import { Box, ChevronUp, FastForward, RotateCcw, Square } from 'lucide-react';
import type { IntegrationTraceResult } from '../../../../shared/integrationTypes';
import { buildAnimationModel } from '../../utils/traceAnimationModel';
import { OUTBOUND_SCENE, type SceneProfile } from '../../utils/traceSceneProfiles';
import { STEP_STATUS_LABELS } from '../../utils/integrationTraceView';
import { useTraceReplay } from '../../hooks/integration/useTraceReplay';
import { TraceAnimationScene } from './TraceAnimationScene';
import { TraceLegend } from './TraceStatusGlyph';
import { TracePathStrip } from './TracePathStrip';

const VIEW_3D_KEY = 'devManager.integrationTrace.view3d';
const EXPANDED_KEY = 'devManager.integrationTrace.pathExpanded';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function saveFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Sem localStorage a preferência vale só nesta tela
  }
}

// Inclinação leve: o trilho vira um tabuleiro visto de cima, sem biblioteca 3D
const TILT_3D = 'rotateX(38deg) rotateZ(-14deg) scale(0.94)';

const BUTTON = 'h-8 px-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5';

interface TraceAnimationPanelProps {
  /** Rastreio de lote ou item do monitor do WSH: a vista só precisa dos passos, da quebra e das lojas. */
  trace: Pick<IntegrationTraceResult, 'id' | 'steps' | 'brokenAt' | 'stores'>;
  /** Linha do modo ao vivo, mostrada sob o desenho enquanto a chegada está em andamento. */
  live?: React.ReactNode;
  liveActive?: boolean;
  /** Sentido do desenho; o padrão é o envio (WinThor → PDVSync). */
  profile?: SceneProfile;
  /** Começa recolhido numa faixa de uma linha (a escolha fica salva); sem isso, a animação aparece sempre. */
  collapsible?: boolean;
}

/** Vista animada do rastreio: o lote percorre as camadas e para onde o rastreio provou que parou. */
export const TraceAnimationPanel: React.FC<TraceAnimationPanelProps> = ({ trace, live, liveActive = false, profile = OUTBOUND_SCENE, collapsible = false }) => {
  const model = useMemo(() => buildAnimationModel(trace, profile), [trace, profile]);
  const { frame, playing, replay, skip, reducedMotion } = useTraceReplay(model, trace.id);
  const [view3d, setView3d] = useState(() => readFlag(VIEW_3D_KEY));
  const [expandedPref, setExpandedPref] = useState(() => readFlag(EXPANDED_KEY));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const expanded = !collapsible || expandedPref;

  if (!model.canonical) return null;

  const toggle3d = () => {
    setView3d(!view3d);
    saveFlag(VIEW_3D_KEY, !view3d);
  };
  const setExpanded = (next: boolean) => {
    setExpandedPref(next);
    saveFlag(EXPANDED_KEY, next);
    // Ao abrir, o percurso toca do começo: é para isso que se abre
    if (next) replay();
  };

  const current = model.steps[frame.index];
  const stop = model.steps[model.stopIndex];
  const caption = !frame.done
    ? `Passo ${frame.index + 1} de ${model.steps.length} · ${current?.label ?? ''}`
    : stop?.id !== 'pdv-arrival'
      ? `Parou em: ${stop?.label} (${STEP_STATUS_LABELS[stop?.status ?? 'unknown']}).`
      : model.endpoints.some((endpoint) => endpoint.key !== 'pdv')
        ? 'Percurso completo. Clique numa loja para ver o status no PDVSync.'
        : `Percurso completo. Clique em ${model.profile.endpointLabel} para ver o detalhe.`;
  const selected = model.endpoints.find((endpoint) => endpoint.key === selectedKey);

  if (!expanded) {
    const finalCaption = stop?.id !== 'pdv-arrival' ? `Parou em: ${stop?.label} (${STEP_STATUS_LABELS[stop?.status ?? 'unknown']}).` : 'Percurso completo.';
    return <TracePathStrip model={model} caption={finalCaption} onExpand={() => setExpanded(true)} />;
  }

  return (
    <section className="bg-card border border-border rounded-xl p-4 space-y-3" data-testid="trace-animation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Percurso do lote</h3>
        <div className="flex items-center gap-2">
          {playing ? (
            <button type="button" onClick={skip} className={BUTTON}>
              <FastForward className="w-3.5 h-3.5" /> Pular
            </button>
          ) : (
            <button type="button" onClick={replay} className={BUTTON} disabled={reducedMotion} title={reducedMotion ? 'Movimento reduzido ativo no sistema' : undefined}>
              <RotateCcw className="w-3.5 h-3.5" /> Replay
            </button>
          )}
          <button type="button" onClick={toggle3d} aria-pressed={view3d} className={`${BUTTON} ${view3d ? 'border-primary text-primary' : ''}`}>
            {view3d ? <Square className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />} {view3d ? 'Vista 2D' : 'Vista 3D'}
          </button>
          {collapsible && (
            <button type="button" onClick={() => setExpanded(false)} aria-expanded={true} className={BUTTON}>
              Recolher <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <TraceLegend />

      {/* Tamanho fixo para o texto não encolher; em coluna estreita, rola na horizontal */}
      <div className="overflow-x-auto overflow-y-hidden rounded-lg" style={{ perspective: '1100px' }}>
        <div
          className={`min-w-fit rounded-lg border border-border/60 bg-muted/20 py-2 transition-transform duration-700 ease-out ${view3d ? 'shadow-xl' : ''}`}
          style={{ transform: view3d ? TILT_3D : 'none', transformOrigin: '50% 55%' }}
        >
          <TraceAnimationScene
            model={model}
            frame={frame}
            reducedMotion={reducedMotion}
            selectedKey={selectedKey}
            onSelect={(key) => setSelectedKey((previous) => (previous === key ? null : key))}
          />
        </div>
      </div>

      {/* Com o ao vivo ligado, a linha dele já diz o que importa; a legenda do passo só volta quando ele para */}
      {!(frame.done && liveActive) && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {caption}
        </p>
      )}

      {selected && frame.done && (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs space-y-1">
          <p className="font-semibold text-foreground">
            {selected.label} · {STEP_STATUS_LABELS[selected.status]}
          </p>
          <p className="text-muted-foreground break-words">{selected.detail}</p>
          {selected.errors.length > 1 && (
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              {selected.errors.slice(0, 5).map((error, index) => (
                <li key={`${error.id ?? ''}-${index}`} className="break-words">
                  {error.id ? `${error.id}: ` : ''}
                  {error.message}
                </li>
              ))}
              {selected.errors.length > 5 && <li>e mais {selected.errors.length - 5} erro(s), no relatório.</li>}
            </ul>
          )}
        </div>
      )}

      {live}
    </section>
  );
};
