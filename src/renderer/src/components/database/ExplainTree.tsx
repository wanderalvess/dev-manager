import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Flame } from 'lucide-react';
import type { ParsedPlan, PlanFlag, PlanNode } from '../../utils/explainPlanUtils';

const FLAG_LABEL: Record<PlanFlag, { text: string; title: string; className: string }> = {
  hotspot: {
    text: 'MAIS CARO',
    title: 'Maior custo próprio do plano: é aqui que a consulta gasta mais',
    className: 'bg-rose-500/15 text-rose-500'
  },
  'full-scan': {
    text: 'FULL SCAN',
    title: 'Lê a tabela inteira. Em tabelas grandes, avalie um índice ou um filtro mais seletivo',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  },
  cartesian: {
    text: 'CARTESIANO',
    title: 'Produto cartesiano: falta condição de junção',
    className: 'bg-rose-500/15 text-rose-500'
  }
};

function barColor(share: number): string {
  if (share >= 0.3) return 'bg-rose-500';
  if (share >= 0.1) return 'bg-amber-500';
  return 'bg-emerald-500/70';
}

const formatCost = (n: number | undefined) => (n === undefined ? '—' : Number.isInteger(n) ? n.toLocaleString('pt-BR') : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));

const NodeRow: React.FC<{ node: PlanNode; expanded: boolean; onToggle: () => void }> = ({ node, expanded, onToggle }) => {
  const hasDetails = node.details.length > 0;
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <div
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 text-xs"
        style={{ paddingLeft: `${8 + node.depth * 18}px` }}
      >
        <button
          type="button"
          onClick={onToggle}
          disabled={!hasDetails}
          aria-label={expanded ? 'Recolher predicados' : 'Mostrar predicados'}
          className="w-4 h-4 shrink-0 text-muted-foreground disabled:opacity-20 cursor-pointer disabled:cursor-default"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-foreground">{node.operation}</span>
          {node.object && <span className="font-mono text-sky-500">{node.object}</span>}
          {node.flags.map((f) => (
            <span key={f} title={FLAG_LABEL[f].title} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-bold ${FLAG_LABEL[f].className}`}>
              {f === 'hotspot' ? <Flame className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {FLAG_LABEL[f].text}
            </span>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0 font-mono text-[11px] text-muted-foreground">
          {node.rows && <span title="Linhas estimadas">{node.rows} lin</span>}
          {node.time && <span title="Tempo">{node.time}</span>}
        </div>

        <div className="w-40 shrink-0" title={`Custo próprio ${formatCost(node.selfCost)} de ${formatCost(node.cost)} acumulado (${Math.round(node.share * 100)}% do plano)`}>
          <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground">
            <span>{formatCost(node.selfCost)}</span>
            <span>{Math.round(node.share * 100)}%</span>
          </div>
          <div className="h-1.5 rounded bg-muted overflow-hidden">
            <div className={`h-full ${barColor(node.share)}`} style={{ width: `${Math.max(2, node.share * 100)}%` }} />
          </div>
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="pb-1.5 text-[11px] font-mono text-muted-foreground space-y-0.5" style={{ paddingLeft: `${34 + node.depth * 18}px` }}>
          {node.details.map((d, i) => (
            <div key={i} className="break-words pr-3">
              {d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Plano de execução em árvore: custo próprio de cada operação, alertas de full scan e predicados sob demanda. */
export const ExplainTree: React.FC<{ plan: ParsedPlan }> = ({ plan }) => {
  // Já abre com os nós de alerta (hotspot, full scan) expandidos
  const initial = useMemo(() => new Set(plan.nodes.filter((n) => n.flags.length > 0).map((n) => n.id)), [plan]);
  const [expanded, setExpanded] = useState<Set<string>>(initial);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Custo total: <strong className="text-foreground font-mono">{formatCost(plan.totalCost)}</strong>
        </span>
        {plan.planHash && (
          <span>
            Plan hash: <span className="font-mono text-foreground">{plan.planHash}</span>
          </span>
        )}
        {plan.summary.map((s) => (
          <span key={s} className="font-mono">
            {s}
          </span>
        ))}
      </div>
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden" role="tree" aria-label="Plano de execução">
        {plan.nodes.map((n) => (
          <NodeRow key={n.id} node={n} expanded={expanded.has(n.id)} onToggle={() => toggle(n.id)} />
        ))}
      </div>
      <p className="text-2xs text-muted-foreground">
        O custo é uma estimativa do otimizador, não tempo medido. "Custo próprio" é o da operação sem contar as filhas.
      </p>
    </div>
  );
};
