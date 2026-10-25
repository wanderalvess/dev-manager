import React from 'react';
import { STEP_STATUS_LABELS } from '../../utils/integrationTraceView';
import {
  branchControls,
  cubicPoint,
  easeInOut,
  isRevealed,
  NODE_STEPS,
  SCENE,
  STEP_POSITIONS,
  trackPoint,
  type AnimEndpoint,
  type TimelineFrame,
  type TraceAnimationModel
} from '../../utils/traceAnimationModel';
import type { IntegrationStepStatus } from '../../../../shared/integrationTypes';

// Literais completos para o scanner do Tailwind
const STROKE: Record<IntegrationStepStatus, string> = {
  ok: 'stroke-success',
  failed: 'stroke-danger',
  pending: 'stroke-warning',
  unknown: 'stroke-muted-foreground',
  skipped: 'stroke-muted-foreground'
};
const FILL: Record<IntegrationStepStatus, string> = {
  ok: 'fill-success',
  failed: 'fill-danger',
  pending: 'fill-warning',
  unknown: 'fill-muted-foreground',
  skipped: 'fill-muted-foreground'
};
/** Sem evidência e pulado ficam tracejados: o trecho existe, mas ninguém provou que o lote passou por ali. */
const dashFor = (status: IntegrationStepStatus) => (status === 'unknown' || status === 'skipped' ? '6 6' : undefined);

const NODES = [
  { key: 'winthor', label: 'WinThor', x: STEP_POSITIONS[0].x },
  { key: 'wsh', label: 'WSH', x: STEP_POSITIONS[2].x },
  { key: 'pdvsync', label: 'PDVSync', x: STEP_POSITIONS[4].x }
] as const;
const NODE_W = 104;
const NODE_H = 52;

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

/** O desenho do percurso: trilho WinThor → WSH → PDVSync, ramos até as lojas e o lote andando. */
export const TraceAnimationScene: React.FC<TraceAnimationSceneProps> = ({ model, frame, reducedMotion, selectedKey, onSelect }) => {
  const indexOf = (id: string) => model.steps.findIndex((step) => step.id === id);
  const arrivalIndex = indexOf('pdv-arrival');
  const arrivalShown = arrivalIndex >= 0 && isRevealed(frame, arrivalIndex);
  const current = model.steps[frame.index];
  const stopStep = model.steps[model.stopIndex];
  const eased = easeInOut(frame.t);
  const activeNode = !frame.done && current ? NODES.find((node) => NODE_STEPS[node.key].includes(current.id as never))?.key : undefined;

  const select = (endpoint: AnimEndpoint) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(endpoint.key);
  };

  return (
    <svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} className="w-full h-auto select-none" role="group" aria-label="Percurso do lote">
      {/* Trilho base e trechos já percorridos */}
      <line x1={STEP_POSITIONS[0].x} y1={SCENE.nodeY} x2={SCENE.branchFromX} y2={SCENE.nodeY} className="stroke-border" strokeWidth={6} strokeLinecap="round" />
      {[1, 2, 3, 4].map((i) => {
        const step = model.steps[i];
        if (!step) return null;
        const from = STEP_POSITIONS[i - 1];
        if (isRevealed(frame, i)) {
          return <line key={step.id} x1={from.x} y1={from.y} x2={STEP_POSITIONS[i].x} y2={from.y} className={STROKE[step.status]} strokeWidth={6} strokeDasharray={dashFor(step.status)} />;
        }
        if (frame.index === i && !frame.done) {
          return <line key={step.id} x1={from.x} y1={from.y} x2={trackPoint(i, eased).x} y2={from.y} className="stroke-primary" strokeWidth={6} />;
        }
        return null;
      })}

      {/* Ramos do PDVSync até cada loja */}
      {model.endpoints.map((endpoint) => (
        <g key={endpoint.key}>
          <path d={branchPath(endpoint.y)} fill="none" className="stroke-border" strokeWidth={3} />
          {arrivalShown && (
            <path d={branchPath(endpoint.y)} fill="none" className={STROKE[endpoint.status]} strokeWidth={3} strokeDasharray={dashFor(endpoint.status)} />
          )}
          {arrivalShown && endpoint.status === 'pending' && !reducedMotion && (
            <circle r={4} className="fill-warning">
              <animateMotion dur="1.8s" repeatCount="indefinite" path={branchPath(endpoint.y)} />
            </circle>
          )}
        </g>
      ))}

      {/* Sistemas, com um ponto de status para cada passo que acontece dentro deles */}
      {NODES.map((node) => {
        const ids = NODE_STEPS[node.key];
        return (
          <g key={node.key}>
            <rect
              x={node.x - NODE_W / 2}
              y={SCENE.nodeY - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx={12}
              className={`fill-card ${activeNode === node.key ? 'stroke-primary' : 'stroke-border'}`}
              strokeWidth={2}
            />
            <text x={node.x} y={SCENE.nodeY - 4} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {node.label}
            </text>
            {ids.map((id, n) => {
              const index = indexOf(id);
              const step = model.steps[index];
              const shown = step && isRevealed(frame, index);
              const cx = node.x + (n - (ids.length - 1) / 2) * 14;
              return (
                <circle key={id} cx={cx} cy={SCENE.nodeY + 13} r={4} className={shown ? FILL[step.status] : 'fill-muted'}>
                  <title>{`${step?.label ?? id}: ${shown ? STEP_STATUS_LABELS[step.status] : 'não alcançado'}`}</title>
                </circle>
              );
            })}
          </g>
        );
      })}

      {/* Lojas: clicáveis para ver o status no PDVSync e os erros */}
      {model.endpoints.map((endpoint) => (
        <g
          key={endpoint.key}
          role="button"
          tabIndex={0}
          aria-label={`${endpoint.label}: ${arrivalShown ? STEP_STATUS_LABELS[endpoint.status] : 'aguardando'}`}
          aria-pressed={selectedKey === endpoint.key}
          onClick={select(endpoint)}
          onKeyDown={select(endpoint)}
          className="cursor-pointer outline-none"
        >
          {selectedKey === endpoint.key && <circle cx={SCENE.endpointX} cy={endpoint.y} r={15} fill="none" className="stroke-primary" strokeWidth={2} />}
          <circle
            cx={SCENE.endpointX}
            cy={endpoint.y}
            r={10}
            className={arrivalShown ? FILL[endpoint.status] : 'fill-muted stroke-border'}
            strokeWidth={arrivalShown ? 0 : 2}
          />
          <text x={SCENE.endpointX + 18} y={endpoint.y + 4} className="fill-foreground text-xs">
            {endpoint.label}
          </text>
        </g>
      ))}

      {/* O lote */}
      {!frame.done && current?.id === 'pdv-arrival' &&
        model.endpoints.map((endpoint) => {
          const point = cubicPoint(...branchControls(endpoint.y), eased);
          return <circle key={endpoint.key} cx={point.x} cy={point.y} r={6} className="fill-primary" />;
        })}
      {!frame.done && current && current.id !== 'pdv-arrival' && (() => {
        const point = trackPoint(frame.index, eased);
        return <circle cx={point.x} cy={point.y} r={7} className="fill-primary stroke-card" strokeWidth={2} />;
      })()}
      {frame.done && stopStep && stopStep.id !== 'pdv-arrival' && (() => {
        const point = trackPoint(model.stopIndex, 1);
        return (
          <g>
            <circle cx={point.x} cy={point.y} r={16} fill="none" className={`${STROKE[stopStep.status]} ${reducedMotion ? '' : 'animate-pulse'}`} strokeWidth={3} />
            <circle cx={point.x} cy={point.y} r={7} className={`${FILL[stopStep.status]} stroke-card`} strokeWidth={2} />
          </g>
        );
      })()}
    </svg>
  );
};
