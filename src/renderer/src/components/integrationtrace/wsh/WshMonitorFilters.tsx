import React from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import type { WshRoute, WshStatusFilter } from '../../../../../shared/wshMonitorTypes';
import { groupWshRoutes } from '../../../utils/wshFlowView';

const FIELD_CLASS = 'h-9 bg-card border border-border rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:border-primary';

const STATUS_OPTIONS: { value: WshStatusFilter; label: string }[] = [
  { value: 'error', label: 'Com erro' },
  { value: 'ok', label: 'Integrados' },
  { value: 'all', label: 'Todos' }
];

const PERIOD_OPTIONS: { hours: number; label: string }[] = [
  { hours: 6, label: 'Últimas 6 horas' },
  { hours: 24, label: 'Últimas 24 horas' },
  { hours: 72, label: 'Últimos 3 dias' },
  { hours: 168, label: 'Últimos 7 dias' },
  { hours: 720, label: 'Últimos 30 dias' },
  { hours: 2160, label: 'Últimos 90 dias' }
];

interface WshMonitorFiltersProps {
  routes: WshRoute[];
  routesError: string | null;
  routeId?: number;
  text: string;
  status: WshStatusFilter;
  lookbackHours: number;
  loading: boolean;
  error: string | null;
  /** Itens da última busca (vazio antes de buscar) e o teto da consulta. */
  resultCount?: number;
  limit?: number;
  onRouteChange: (routeId?: number) => void;
  onTextChange: (text: string) => void;
  onStatusChange: (status: WshStatusFilter) => void;
  onLookbackChange: (hours: number) => void;
  onSearch: () => void;
  onOpenSettings: () => void;
}

const LABEL_CLASS = 'flex items-center gap-2 text-xs font-bold text-foreground';

/** Os mesmos filtros do monitor do WSH (fluxo, dado, status e período) numa barra de uma linha, com a contagem à direita. */
export const WshMonitorFilters: React.FC<WshMonitorFiltersProps> = (props) => (
  <form
    className="shrink-0 bg-card border border-border rounded-xl px-3 py-2 space-y-1.5"
    onSubmit={(event) => {
      event.preventDefault();
      if (!props.loading) props.onSearch();
    }}
  >
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label className={LABEL_CLASS}>
        Fluxo
        <select
          id="wsh-route"
          value={props.routeId ?? ''}
          onChange={(e) => props.onRouteChange(e.target.value ? Number(e.target.value) : undefined)}
          className={`${FIELD_CLASS} w-64 font-normal`}
        >
          <option value="">Todos os fluxos</option>
          {groupWshRoutes(props.routes).map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Dado
        <input
          id="wsh-text"
          type="text"
          value={props.text}
          onChange={(e) => props.onTextChange(e.target.value)}
          className={`${FIELD_CLASS} w-52 font-mono font-normal`}
          placeholder="produto-1000, PIX ou cupom 10905"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <fieldset className="flex items-center gap-2 min-w-0">
        <legend className="sr-only">Status</legend>
        <div className="flex h-9 rounded-[10px] border border-border overflow-hidden">
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center px-3 text-sm cursor-pointer whitespace-nowrap transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary ${
                props.status === option.value ? 'bg-primary text-primary-foreground font-medium' : 'bg-card text-foreground hover:bg-muted'
              }`}
            >
              <input
                type="radio"
                name="wsh-status"
                value={option.value}
                checked={props.status === option.value}
                onChange={() => props.onStatusChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <select
        id="wsh-period"
        aria-label="Período"
        value={props.lookbackHours}
        onChange={(e) => props.onLookbackChange(Number(e.target.value))}
        className={FIELD_CLASS}
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.hours} value={option.hours}>{option.label}</option>
        ))}
      </select>
      <button
        type="submit"
        className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2"
      >
        {props.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        <span>{props.loading ? 'Buscando...' : 'Buscar'}</span>
      </button>
      {props.resultCount !== undefined && (
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {props.resultCount} item(ns)
          {props.limit && props.resultCount >= props.limit ? ` · os ${props.limit} mais recentes, refine a busca` : ''}
        </span>
      )}
    </div>

    {(props.error || props.routesError) && (
      <div role="alert" className="text-xs text-danger flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {props.error ?? props.routesError}{' '}
          {props.routesError && (
            <button type="button" onClick={props.onOpenSettings} className="underline font-medium">
              Abrir configurações
            </button>
          )}
        </span>
      </div>
    )}
  </form>
);
