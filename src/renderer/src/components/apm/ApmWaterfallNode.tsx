import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, Zap } from 'lucide-react';
import type { TraceSpanTreeNode } from '../../../../shared/types';
import { categorizeSpan, type SpanTierCategory } from '../../utils/apmUiUtils';

interface WaterfallNodeProps {
  node: TraceSpanTreeNode;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
  tierFilter?: SpanTierCategory | 'ALL';
}

export const ApmWaterfallNode: React.FC<WaterfallNodeProps> = ({ node, selectedSpanId, onSelectSpan, tierFilter = 'ALL' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { span, depth, offsetPercent, widthPercent, children } = node;
  const isSelected = selectedSpanId === span.spanId;
  const tier = categorizeSpan(span);

  const hasChildren = children && children.length > 0;
  const isDimmed = tierFilter !== 'ALL' && tier.category !== tierFilter;

  // Cor da barra de tempo do waterfall baseada na camada semântica (HTTP / Java / JDBC)
  const getBarColor = () => {
    if (span.statusCode === 'ERROR' || (span.httpStatusCode && span.httpStatusCode >= 500)) {
      return 'bg-rose-500';
    }
    if (tier.category === 'jdbc' || span.dbStatement) {
      return 'bg-amber-500';
    }
    if (tier.category === 'java') {
      return 'bg-purple-500/85';
    }
    return 'bg-sky-500';
  };

  return (
    <div className={`flex flex-col transition-opacity duration-150 ${isDimmed ? 'opacity-35 hover:opacity-100' : 'opacity-100'}`}>
      <div
        onClick={() => onSelectSpan(span.spanId)}
        className={`group py-1 px-2 rounded flex items-center justify-between text-xs font-mono transition cursor-pointer ${
          isSelected ? 'bg-primary/20 border border-primary/50' : 'hover:bg-muted/40'
        }`}
      >
        {/* Identificação do Span (Indentada por depth com guia de árvore e pílula de camada) */}
        <div
          className="flex items-center gap-1.5 truncate max-w-[54%]"
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          {depth > 0 && (
            <span className="text-border shrink-0 font-mono text-[10px]">└</span>
          )}

          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-4 h-4 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* Pílula Semântica de Camada: [HTTP], [JAVA], [JDBC] */}
          <span
            className={`px-1 py-0.2 rounded border text-[9px] font-bold tracking-tight shrink-0 ${tier.badgeClass}`}
            title={`Camada: ${tier.label}`}
          >
            {tier.label}
          </span>

          {span.dbStatement ? (
            <Database className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                span.statusCode === 'ERROR' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
          )}

          <span className="truncate text-foreground font-medium text-[11px]" title={span.name}>
            {span.name}
          </span>

          {/* Tag de Alerta para Consulta/Span Lento (>= 300ms) */}
          {tier.isSlow && (
            <span
              className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-0.5 shrink-0"
              title={`Span com duração elevada: ${span.durationMs}ms`}
            >
              <Zap className="w-2.5 h-2.5 text-amber-500" />
              <span>Lenta</span>
            </span>
          )}
        </div>

        {/* Régua e Barra Proporcional de Tempo com Indicador Milimétrico */}
        <div className="w-[44%] h-4 bg-muted/20 rounded relative flex items-center overflow-hidden">
          <div
            style={{
              left: `${offsetPercent}%`,
              width: `${Math.max(2, widthPercent)}%`
            }}
            className={`h-2.5 rounded absolute transition-all ${getBarColor()}`}
            title={`${span.name}: ${span.durationMs}ms (início: +${offsetPercent}%) [${tier.label}]`}
          />
          <span className="absolute right-1 text-[10px] font-mono text-foreground/80 dark:text-muted-foreground tabular-nums">
            {span.durationMs}ms
          </span>
        </div>
      </div>

      {/* Filhos recursivos com linha guia vertical */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col border-l border-border/30 ml-3 pl-1">
          {children.map((child) => (
            <ApmWaterfallNode
              key={child.span.spanId}
              node={child}
              selectedSpanId={selectedSpanId}
              onSelectSpan={onSelectSpan}
              tierFilter={tierFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
};
