import React from 'react';
import { SCENE_STATUS_LABELS, type SceneStatus } from '../../utils/traceAnimationModel';

/**
 * Ícone de status do percurso. Cada estado tem forma própria (check, X, relógio, tracejado, cheio claro),
 * para não depender só da cor: verde e vermelho têm a mesma luminosidade.
 */
export const TraceStatusGlyph: React.FC<{ status: SceneStatus; size?: number }> = ({ status, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
    {status === 'ok' && (
      <>
        <circle cx={7} cy={7} r={7} className="fill-success" />
        <path d="M4 7.2l2 2 4-4.4" fill="none" className="stroke-white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
    {status === 'failed' && (
      <>
        <circle cx={7} cy={7} r={7} className="fill-danger" />
        <path d="M4.6 4.6l4.8 4.8M9.4 4.6l-4.8 4.8" fill="none" className="stroke-white" strokeWidth={1.8} strokeLinecap="round" />
      </>
    )}
    {status === 'pending' && (
      <>
        <circle cx={7} cy={7} r={6} className="fill-card stroke-warning" strokeWidth={2} />
        <path d="M7 4v3.2l2 1.3" fill="none" className="stroke-warning" strokeWidth={1.6} strokeLinecap="round" />
      </>
    )}
    {status === 'unknown' && <circle cx={7} cy={7} r={6} fill="none" className="stroke-muted-foreground" strokeWidth={1.6} strokeDasharray="2.4 2" />}
    {status === 'skipped' && (
      <>
        <circle cx={7} cy={7} r={6} fill="none" className="stroke-muted-foreground" strokeWidth={1.6} />
        <path d="M4.5 7h5" className="stroke-muted-foreground" strokeWidth={1.6} strokeLinecap="round" />
      </>
    )}
    {status === 'unreached' && <circle cx={7} cy={7} r={6} className="fill-border" />}
  </svg>
);

const LEGEND: SceneStatus[] = ['ok', 'failed', 'pending', 'unknown', 'unreached'];
const LEGEND_LABELS: Partial<Record<SceneStatus, string>> = { pending: 'em andamento' };

/** Legenda dos estados, acima do desenho. */
export const TraceLegend: React.FC = () => (
  <ul aria-label="Legenda do percurso" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
    {LEGEND.map((status) => (
      <li key={status} className="flex items-center gap-1.5">
        <TraceStatusGlyph status={status} />
        {LEGEND_LABELS[status] ?? SCENE_STATUS_LABELS[status]}
      </li>
    ))}
  </ul>
);
