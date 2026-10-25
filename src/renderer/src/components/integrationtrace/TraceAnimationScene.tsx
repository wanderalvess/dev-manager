import React from 'react';
import {
  branchControls,
  cubicPoint,
  easeInOut,
  endpointHeight,
  SCENE,
  sceneStatus,
  STEP_POSITIONS,
  trackPoint,
  type SceneStatus,
  type TimelineFrame,
  type TraceAnimationModel
} from '../../utils/traceAnimationModel';
import { TraceSceneNodes, TraceSceneStores } from './TraceSceneNodes';

// Literais completos para o scanner do Tailwind
const STROKE: Record<SceneStatus, string> = {
  ok: 'stroke-success',
  failed: 'stroke-danger',
  pending: 'stroke-warning',
  unknown: 'stroke-muted-foreground',
  skipped: 'stroke-muted-foreground',
  unreached: 'stroke-border'
};
const FILL: Record<SceneStatus, string> = {
  ok: 'fill-success',
  failed: 'fill-danger',
  pending: 'fill-warning',
  unknown: 'fill-muted-foreground',
  skipped: 'fill-muted-foreground',
  unreached: 'fill-border'
};
/** Sem evidência e pulado ficam tracejados: o trecho existe, mas ninguém provou que o lote passou por ali. */
const dashFor = (status: SceneStatus) => (status === 'unknown' || status === 'skipped' ? '6 6' : undefined);

const branchPath = (y: number) => {
  const [from, c1, c2, to] = branchControls(y);
  return `M${from.x},${from.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`;
};

interface TraceAnimationSceneProps {
  model: TraceAnimationModel;
  frame: TimelineFrame;
  reducedMotion: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

/**
 * O desenho do percurso em pixels fixos: trilhos e ramos num SVG por baixo, sistemas e lojas em HTML por cima
 * (texto em tamanho real, botões de verdade) e o lote num SVG no topo.
 */
export const TraceAnimationScene: React.FC<TraceAnimationSceneProps> = ({ model, frame, reducedMotion, selectedKey, onSelect }) => {
  const arrivalIndex = model.steps.findIndex((step) => step.id === 'pdv-arrival');
  const arrivalShown = arrivalIndex >= 0 && sceneStatus(model, frame, arrivalIndex) !== 'unreached';
  const current = model.steps[frame.index];
  const stopStep = model.steps[model.stopIndex];
  const eased = easeInOut(frame.t);
  const size = { width: SCENE.width, height: SCENE.height };

  return (
    <div className="relative mx-auto" style={size}>
      <svg {...size} className="absolute inset-0" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => {
          const step = model.steps[i];
          if (!step) return null;
          const from = STEP_POSITIONS[i - 1];
          const status = sceneStatus(model, frame, i);
          return (
            <g key={step.id}>
              <line x1={from.x} y1={from.y} x2={STEP_POSITIONS[i].x} y2={from.y} className={STROKE[status]} strokeWidth={4} strokeDasharray={dashFor(status)} />
              {frame.index === i && !frame.done && (
                <line x1={from.x} y1={from.y} x2={trackPoint(i, eased).x} y2={from.y} className="stroke-primary" strokeWidth={4} />
              )}
            </g>
          );
        })}
        {model.endpoints.map((endpoint) => {
          const status: SceneStatus = arrivalShown ? endpoint.status : 'unreached';
          return (
            <g key={endpoint.key}>
              <path d={branchPath(endpoint.y)} fill="none" className={STROKE[status]} strokeWidth={4} strokeDasharray={dashFor(status)} />
              {status === 'pending' && !reducedMotion && (
                <circle r={5} className="fill-warning">
                  <animateMotion dur="1.8s" repeatCount="indefinite" path={branchPath(endpoint.y)} />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      <TraceSceneNodes model={model} frame={frame} />
      <TraceSceneStores
        endpoints={model.endpoints}
        arrivalShown={arrivalShown}
        height={endpointHeight(model.endpoints.length)}
        selectedKey={selectedKey}
        onSelect={onSelect}
      />

      <svg {...size} className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {!frame.done && current?.id === 'pdv-arrival' &&
          model.endpoints.map((endpoint) => {
            const point = cubicPoint(...branchControls(endpoint.y), eased);
            return <circle key={endpoint.key} cx={point.x} cy={point.y} r={6} className="fill-primary stroke-card" strokeWidth={2} />;
          })}
        {!frame.done && current && current.id !== 'pdv-arrival' && (() => {
          const point = trackPoint(frame.index, eased);
          return <circle cx={point.x} cy={point.y} r={7} className="fill-primary stroke-card" strokeWidth={2} />;
        })()}
        {frame.done && stopStep && stopStep.id !== 'pdv-arrival' && (() => {
          const point = trackPoint(model.stopIndex, 1);
          return (
            <g>
              <circle cx={point.x} cy={point.y} r={15} fill="none" className={`${STROKE[stopStep.status]} ${reducedMotion ? '' : 'animate-pulse'}`} strokeWidth={2.5} opacity={0.6} />
              <circle cx={point.x} cy={point.y} r={7} className={`${FILL[stopStep.status]} stroke-card`} strokeWidth={2} />
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
