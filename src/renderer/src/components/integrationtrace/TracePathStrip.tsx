import React from 'react';
import { ChevronDown, Play } from 'lucide-react';
import {
  NODE_STEPS,
  nodeStatus,
  SCENE_STATUS_LABELS,
  sceneStatus,
  timelineAt,
  worstStatus,
  type SceneNodeKey,
  type SceneStatus,
  type TraceAnimationModel
} from '../../utils/traceAnimationModel';
import { TraceStatusGlyph } from './TraceStatusGlyph';

// Literais completos para o scanner do Tailwind
const CONNECTOR: Record<SceneStatus, string> = {
  ok: 'bg-success',
  failed: 'bg-danger',
  pending: 'bg-warning',
  unknown: 'bg-[repeating-linear-gradient(90deg,var(--color-muted-foreground)_0_4px,transparent_4px_8px)]',
  skipped: 'bg-[repeating-linear-gradient(90deg,var(--color-muted-foreground)_0_4px,transparent_4px_8px)]',
  unreached: 'bg-border'
};

const NODE_ORDER: SceneNodeKey[] = ['winthor', 'wsh', 'pdvsync'];
/** Passos que formam a ligação depois de cada sistema (WinThor → WSH e WSH → PDVSync). */
const LINK_STEPS: Record<'winthor' | 'wsh', number[]> = { winthor: [1, 2], wsh: [3, 4] };

interface TracePathStripProps {
  model: TraceAnimationModel;
  caption: string;
  onExpand: () => void;
}

/** O percurso recolhido numa linha: os sistemas com os ícones de cada passo, as ligações e onde parou. */
export const TracePathStrip: React.FC<TracePathStripProps> = ({ model, caption, onExpand }) => {
  const frame = timelineAt(model, Number.POSITIVE_INFINITY);
  const linkStatus = (indexes: number[]): SceneStatus => {
    const shown = indexes.map((index) => sceneStatus(model, frame, index)).filter((status) => status !== 'unreached');
    return shown.length === 0 ? 'unreached' : worstStatus(shown as Exclude<SceneStatus, 'unreached'>[]);
  };
  const arrivalIndex = model.steps.findIndex((step) => step.id === 'pdv-arrival');
  const arrivalShown = arrivalIndex >= 0 && sceneStatus(model, frame, arrivalIndex) !== 'unreached';
  const endpointStatus: SceneStatus = arrivalShown ? worstStatus(model.endpoints.map((endpoint) => endpoint.status)) : 'unreached';
  const endpointLabel = model.endpoints.length > 1 ? `${model.endpoints.length} lojas` : (model.endpoints[0]?.label ?? model.profile.endpointLabel);

  return (
    <section className="border border-border rounded-xl px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="trace-path-strip" aria-label="Percurso, recolhido">
      <h3 className="text-xs font-semibold text-foreground">Percurso</h3>
      <ol className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
        {NODE_ORDER.map((key) => {
          const status = nodeStatus(model, frame, key);
          const label = model.profile.nodeLabels[key];
          const steps = NODE_STEPS[key].map((id) => model.steps.findIndex((step) => step.id === id));
          return (
            <React.Fragment key={key}>
              <li
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-[1.5px] text-xs ${status === 'failed' ? 'border-danger' : 'border-border'}`}
                aria-label={`${label}: ${steps.map((index) => `${model.steps[index]?.shortLabel} ${SCENE_STATUS_LABELS[sceneStatus(model, frame, index)]}`).join(', ')}`}
              >
                <span className="font-semibold text-foreground">{label}</span>
                {steps.map((index) => (
                  <span key={index} title={`${model.steps[index]?.shortLabel}: ${SCENE_STATUS_LABELS[sceneStatus(model, frame, index)]}`}>
                    <TraceStatusGlyph status={sceneStatus(model, frame, index)} size={13} />
                  </span>
                ))}
              </li>
              <li aria-hidden="true" className={`w-5 h-[3px] rounded-full ${CONNECTOR[key === 'pdvsync' ? endpointStatus : linkStatus(LINK_STEPS[key])]}`} />
            </React.Fragment>
          );
        })}
        <li
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-[1.5px] border-border text-xs ${endpointStatus === 'unreached' ? 'text-muted-foreground' : 'text-foreground'}`}
          aria-label={`${endpointLabel}: ${SCENE_STATUS_LABELS[endpointStatus]}`}
        >
          <TraceStatusGlyph status={endpointStatus} size={13} />
          {endpointLabel}
        </li>
        <li className="text-xs text-muted-foreground ml-1">{caption}</li>
      </ol>
      <button
        type="button"
        onClick={onExpand}
        aria-expanded={false}
        className="h-8 px-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
      >
        <Play className="w-3.5 h-3.5" /> Ver animação <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </section>
  );
};
