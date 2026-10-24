import React from 'react';
import { Ban, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { QualityMetrics } from '../../../utils/qualityPageUtils';

interface QualityMetricsStripProps {
  metrics: QualityMetrics;
  /** Quando informado, os cards de status viram atalhos que filtram a Matriz. */
  onFilterStatus?: (status: string) => void;
}

const Tile: React.FC<{ status: string; label: string; onFilterStatus?: (status: string) => void; children: React.ReactNode }> = ({
  status,
  label,
  onFilterStatus,
  children
}) =>
  onFilterStatus ? (
    <button
      type="button"
      onClick={() => onFilterStatus(status)}
      title={`Filtrar Matriz: ${label}`}
      className="px-4 py-3.5 space-y-0.5 text-left hover:bg-muted/50 transition-colors cursor-pointer"
    >
      {children}
    </button>
  ) : (
    <div className="px-4 py-3.5 space-y-0.5">{children}</div>
  );

export const QualityMetricsStrip: React.FC<QualityMetricsStripProps> = ({ metrics, onFilterStatus }) => (
  <div className="border border-border rounded-[14px] shadow-xs bg-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
    <Tile status="all" label="Todos" onFilterStatus={onFilterStatus}>
      <span className="text-[13px] text-muted-foreground block">Cenários</span>
      <div className="text-2xl font-semibold tabular-nums text-foreground">{metrics.total}</div>
    </Tile>
    <Tile status="passed" label="Aprovados" onFilterStatus={onFilterStatus}>
      <span className="text-[13px] text-muted-foreground flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Aprovados
      </span>
      <div className="text-2xl font-semibold tabular-nums text-success">{metrics.passed}</div>
    </Tile>
    <Tile status="in_progress" label="Em Teste" onFilterStatus={onFilterStatus}>
      <span className="text-[13px] text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" /> Em teste
      </span>
      <div className="text-2xl font-semibold tabular-nums text-info">{metrics.inProgress}</div>
    </Tile>
    <Tile status="failed" label="Falhas" onFilterStatus={onFilterStatus}>
      <span className="text-[13px] text-muted-foreground flex items-center gap-1">
        <XCircle className="w-3 h-3" /> Falhas
      </span>
      <div className="text-2xl font-semibold tabular-nums text-danger">{metrics.failed}</div>
    </Tile>
    <Tile status="blocked" label="Bloqueados" onFilterStatus={onFilterStatus}>
      <span className="text-[13px] text-muted-foreground flex items-center gap-1">
        <Ban className="w-3 h-3" /> Bloqueados
      </span>
      <div className="text-2xl font-semibold tabular-nums text-warning">{metrics.blocked}</div>
    </Tile>
    <div className="px-4 py-3.5 space-y-0.5">
      <span className="text-[13px] text-muted-foreground block">Taxa de sucesso</span>
      <div className="text-2xl font-semibold tabular-nums text-foreground">{metrics.passRate}%</div>
    </div>
  </div>
);
