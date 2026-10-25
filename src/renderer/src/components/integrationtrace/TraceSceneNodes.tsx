import React from 'react';
import {
  NODE_STEPS,
  SCENE,
  STEP_POSITIONS,
  STEP_SHORT_LABELS,
  nodeStatus,
  SCENE_STATUS_LABELS,
  sceneStatus,
  type AnimEndpoint,
  type SceneNodeKey,
  type SceneStatus,
  type TimelineFrame,
  type TraceAnimationModel
} from '../../utils/traceAnimationModel';
import { TraceStatusGlyph } from './TraceStatusGlyph';

// Literais completos para o scanner do Tailwind
const BORDER: Record<SceneStatus, string> = {
  ok: 'border-success',
  failed: 'border-danger',
  pending: 'border-warning',
  unknown: 'border-border',
  skipped: 'border-border',
  unreached: 'border-border'
};

const NODES: { key: SceneNodeKey; label: string; x: number }[] = [
  { key: 'winthor', label: 'WinThor', x: STEP_POSITIONS[0].x },
  { key: 'wsh', label: 'WSH', x: STEP_POSITIONS[2].x },
  { key: 'pdvsync', label: 'PDVSync', x: STEP_POSITIONS[4].x }
];

interface NodesProps {
  model: TraceAnimationModel;
  frame: TimelineFrame;
}

/** Os três sistemas, cada um com os passos que acontecem dentro dele como chips com nome e ícone. */
export const TraceSceneNodes: React.FC<NodesProps> = ({ model, frame }) => {
  const current = model.steps[frame.index];
  return (
    <>
      {NODES.map((node) => {
        const status = nodeStatus(model, frame, node.key);
        const active = !frame.done && current && NODE_STEPS[node.key].includes(current.id as never);
        const dimmed = frame.done && status === 'unreached';
        return (
          <div
            key={node.key}
            role="group"
            aria-label={node.label}
            className={`absolute -translate-y-1/2 bg-card rounded-xl border-[1.5px] px-3 py-2.5 flex flex-col gap-1.5 transition-colors ${
              active ? 'border-primary' : status === 'failed' ? 'border-danger' : 'border-border'
            } ${dimmed ? 'text-muted-foreground' : 'text-foreground'}`}
            style={{ left: node.x - SCENE.nodeWidth / 2, top: SCENE.nodeY, width: SCENE.nodeWidth }}
          >
            <span className="text-sm font-semibold leading-tight">{node.label}</span>
            <ul className="flex flex-col gap-1">
              {NODE_STEPS[node.key].map((id) => {
                const index = model.steps.findIndex((step) => step.id === id);
                const stepStatus = sceneStatus(model, frame, index);
                const label = STEP_SHORT_LABELS[id] ?? id;
                return (
                  <li
                    key={id}
                    aria-label={`${label}: ${SCENE_STATUS_LABELS[stepStatus]}`}
                    className={`flex items-center gap-1.5 text-xs ${
                      stepStatus === 'failed' ? 'text-danger font-semibold' : stepStatus === 'unreached' ? 'text-muted-foreground' : ''
                    }`}
                  >
                    <TraceStatusGlyph status={stepStatus} />
                    <span className="truncate" title={label}>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
};

const STORE_SUBLABELS: Record<SceneStatus, string> = {
  ok: 'baixou',
  failed: 'com erro',
  pending: 'baixando',
  unknown: 'sem evidência',
  skipped: 'pulado',
  unreached: 'aguardando'
};

interface StoresProps {
  endpoints: AnimEndpoint[];
  arrivalShown: boolean;
  height: number;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

/** As lojas (ou o PDV), botões de verdade para o teclado alcançar, com o status provado pelo PDVSync. */
export const TraceSceneStores: React.FC<StoresProps> = ({ endpoints, arrivalShown, height, selectedKey, onSelect }) => (
  <>
    {endpoints.map((endpoint) => {
      const status: SceneStatus = arrivalShown ? endpoint.status : 'unreached';
      const selected = selectedKey === endpoint.key;
      return (
        <button
          key={endpoint.key}
          type="button"
          aria-pressed={selected}
          aria-label={`${endpoint.label}: ${SCENE_STATUS_LABELS[status]}`}
          onClick={() => onSelect(endpoint.key)}
          className={`absolute -translate-y-1/2 bg-card rounded-[10px] border-[1.5px] px-2.5 flex items-center gap-2 text-left text-xs font-medium cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
            BORDER[status]
          } ${selected ? 'ring-2 ring-primary/60' : ''} ${status === 'unreached' ? 'text-muted-foreground' : 'text-foreground'}`}
          style={{ left: SCENE.endpointX, top: endpoint.y, width: SCENE.endpointWidth, height }}
        >
          <TraceStatusGlyph status={status} size={16} />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="truncate">{endpoint.label}</span>
            {height >= 40 && <span className="text-muted-foreground font-normal truncate">{STORE_SUBLABELS[status]}</span>}
          </span>
        </button>
      );
    })}
  </>
);
