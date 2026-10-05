import React from 'react';
import { AlertCircle, Check, Code2, Copy, Database, Layers, Maximize2, Minimize2, X } from 'lucide-react';
import type { TraceDetails, TraceSpan } from '../../../../shared/types';
import type { SpanTierCategory, TimeBudgetData } from '../../utils/apmUiUtils';
import { getMethodBadgeClass, getStatusBadgeClass } from '../../utils/apmUiUtils';
import { ApmErrorSpans } from './ApmErrorSpans';
import { ApmSpanAttributes } from './ApmSpanAttributes';
import { ApmSqlSpans } from './ApmSqlSpans';
import { ApmTimeBudgetPanel } from './ApmTimeBudgetPanel';
import { ApmTraceWaterfall } from './ApmTraceWaterfall';
import type { DetailTab } from './apmTypes';

export interface ApmTraceDetailsProps {
  details: TraceDetails | null;
  activeSpan: TraceSpan | null;
  errorSpans: TraceSpan[];
  timeBudget: TimeBudgetData | null;
  hasSqlTab: boolean;
  hasErrorTab: boolean;
  visibleTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  copyToClipboard: (text: string, key: string) => void;
  copyFeedback: string | null;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
  waterfallTierFilter: SpanTierCategory | 'ALL';
  setWaterfallTierFilter: React.Dispatch<React.SetStateAction<SpanTierCategory | 'ALL'>>;
  onNavigateToDatabase?: () => void;
}

export const ApmTraceDetails: React.FC<ApmTraceDetailsProps> = ({
  details, activeSpan, errorSpans, timeBudget, hasSqlTab, hasErrorTab, visibleTab, setDetailTab,
  isExpanded, setIsExpanded, onClose, copyToClipboard, copyFeedback, selectedSpanId, onSelectSpan,
  waterfallTierFilter, setWaterfallTierFilter, onNavigateToDatabase
}) => (
  <aside
    aria-label="Inspeção de Trace"
    className={
      isExpanded
        ? 'fixed inset-3 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200'
        : 'w-[44%] h-full flex flex-col bg-card/95 backdrop-blur-xs border-l border-border shadow-2xl z-20 overflow-hidden animate-in slide-in-from-right duration-200'
    }
  >
    <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-muted/20">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className={`px-1.5 py-0.5 rounded border text-2xs font-bold ${getMethodBadgeClass(details?.summary.httpMethod)}`}>
          {details?.summary.httpMethod || 'HTTP'}
        </span>
        <span className="font-mono text-xs font-bold text-foreground truncate">
          {details?.summary.httpRoute || details?.summary.rootSpanName}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setIsExpanded((previous) => !previous)}
          title={isExpanded ? 'Restaurar para painel lateral' : 'Expandir para visualização completa'}
          className="h-6 w-6 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition"
        >
          {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => details?.summary.traceId && copyToClipboard(details.summary.traceId, 'traceId')}
          title="Copiar Trace ID"
          className="h-6 px-2 rounded border border-border bg-card hover:bg-muted text-2xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          {copyFeedback === 'traceId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>ID</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Fechar painel (Esc)"
          className="h-6 w-6 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    <div className="px-3.5 py-1.5 border-b border-border/60 bg-background/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
      <div className="flex items-center gap-3">
        <span>Status: <strong className={getStatusBadgeClass(details?.summary.httpStatusCode, details?.summary.hasError)}>
          {details?.summary.httpStatusCode || (details?.summary.hasError ? 'ERR' : 'OK')}
        </strong></span>
        <span>•</span>
        <span>Duração: <strong className="text-foreground">{details?.summary.durationMs}ms</strong></span>
        <span>•</span>
        <span>Serviço: <strong className="text-primary">{details?.summary.serviceName}</strong></span>
      </div>
      <span>{details?.spans.length || 0} spans</span>
    </div>
    <ApmTimeBudgetPanel
      timeBudget={timeBudget}
      hasSqlTab={hasSqlTab}
      onSelectTab={setDetailTab}
      onSelectTier={(tier) => {
        setDetailTab('waterfall');
        setWaterfallTierFilter(tier);
      }}
    />
    <div className="h-8 px-3 border-b border-border flex items-center gap-1 shrink-0 bg-card/40">
      <button
        type="button"
        onClick={() => setDetailTab('waterfall')}
        className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
          visibleTab === 'waterfall' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        <Layers className="w-3 h-3" /><span>Waterfall ({details?.spans.length || 0})</span>
      </button>
      <button
        type="button"
        onClick={() => setDetailTab('attributes')}
        className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
          visibleTab === 'attributes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        <Code2 className="w-3 h-3" /><span>Atributos</span>
      </button>
      {hasSqlTab && (
        <button
          type="button"
          onClick={() => setDetailTab('sql')}
          className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            visibleTab === 'sql' ? 'border-sky-500 text-sky-700 dark:border-sky-400 dark:text-sky-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database className="w-3 h-3" /><span>Queries SQL</span>
        </button>
      )}
      {hasErrorTab && (
        <button
          type="button"
          onClick={() => setDetailTab('error')}
          className={`h-full px-2.5 text-[11px] font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            visibleTab === 'error' ? 'border-rose-500 text-rose-700 dark:border-rose-400 dark:text-rose-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertCircle className="w-3 h-3" /><span>Erro / Stacktrace</span>
        </button>
      )}
    </div>
    <div className="flex-1 overflow-auto p-3">
      {visibleTab === 'waterfall' && (
        <ApmTraceWaterfall
          details={details}
          activeSpan={activeSpan}
          selectedSpanId={selectedSpanId}
          onSelectSpan={onSelectSpan}
          tierFilter={waterfallTierFilter}
          onTierFilterChange={setWaterfallTierFilter}
          timeBudget={timeBudget}
          copyToClipboard={copyToClipboard}
          copyFeedback={copyFeedback}
          onNavigateToDatabase={onNavigateToDatabase}
          onSelectTab={setDetailTab}
        />
      )}
      {visibleTab === 'attributes' && <ApmSpanAttributes span={activeSpan} />}
      {visibleTab === 'sql' && (
        <ApmSqlSpans spans={details?.spans || []} copyToClipboard={copyToClipboard} copyFeedback={copyFeedback} onNavigateToDatabase={onNavigateToDatabase} />
      )}
      {visibleTab === 'error' && <ApmErrorSpans spans={errorSpans} copyToClipboard={copyToClipboard} copyFeedback={copyFeedback} />}
    </div>
  </aside>
);
