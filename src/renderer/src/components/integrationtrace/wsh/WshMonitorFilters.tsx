import React from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import type { WshRoute, WshStatusFilter } from '../../../../../shared/wshMonitorTypes';
import { groupWshRoutes } from '../../../utils/wshFlowView';

const FIELD_CLASS =
  'w-full h-10 bg-card border border-border rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:border-primary';

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
  onRouteChange: (routeId?: number) => void;
  onTextChange: (text: string) => void;
  onStatusChange: (status: WshStatusFilter) => void;
  onLookbackChange: (hours: number) => void;
  onSearch: () => void;
  onOpenSettings: () => void;
}

/** Os mesmos filtros do monitor do WSH: rota (o fluxo), o dado e o status. */
export const WshMonitorFilters: React.FC<WshMonitorFiltersProps> = (props) => (
  <form
    className="bg-card border border-border rounded-xl p-4 space-y-3"
    onSubmit={(event) => {
      event.preventDefault();
      if (!props.loading) props.onSearch();
    }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_minmax(0,0.8fr)_auto] gap-3 items-end">
      <div className="space-y-1">
        <label htmlFor="wsh-route" className="text-xs font-bold text-foreground block">Fluxo</label>
        <select
          id="wsh-route"
          value={props.routeId ?? ''}
          onChange={(e) => props.onRouteChange(e.target.value ? Number(e.target.value) : undefined)}
          className={FIELD_CLASS}
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
      </div>
      <div className="space-y-1">
        <label htmlFor="wsh-text" className="text-xs font-bold text-foreground block">Dado</label>
        <input
          id="wsh-text"
          type="text"
          value={props.text}
          onChange={(e) => props.onTextChange(e.target.value)}
          className={`${FIELD_CLASS} font-mono`}
          placeholder="produto-1000 ou PIX"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <fieldset className="space-y-1 min-w-0">
        <legend className="text-xs font-bold text-foreground mb-1">Status</legend>
        <div className="flex h-10 rounded-[10px] border border-border overflow-hidden">
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
      <div className="space-y-1">
        <label htmlFor="wsh-period" className="text-xs font-bold text-foreground block">Período</label>
        <select id="wsh-period" value={props.lookbackHours} onChange={(e) => props.onLookbackChange(Number(e.target.value))} className={FIELD_CLASS}>
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.hours} value={option.hours}>{option.label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2"
      >
        {props.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        <span>{props.loading ? 'Buscando...' : 'Buscar'}</span>
      </button>
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
