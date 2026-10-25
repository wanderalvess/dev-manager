import React from 'react';
import { AlertTriangle, Loader2, Search, Settings } from 'lucide-react';
import type { IntegrationFlowDefinition } from '../../../../shared/integrationTypes';
import { LOOKBACK_OPTIONS } from '../../utils/integrationTraceView';

const FIELD_CLASS =
  'w-full h-10 bg-card border border-border rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:border-primary';

interface BatchTraceFormProps {
  flows: IntegrationFlowDefinition[];
  flowId: string;
  batchNumber: string;
  lookbackMinutes: number;
  branchId: string;
  running: boolean;
  error: string | null;
  onFlowChange: (id: string) => void;
  onBatchChange: (value: string) => void;
  onLookbackChange: (minutes: number) => void;
  onBranchChange: (value: string) => void;
  onRun: () => void;
  onOpenSettings: () => void;
}

/** Formulário do rastreio: qual fluxo, qual lote e quanto tempo olhar para trás. */
export const BatchTraceForm: React.FC<BatchTraceFormProps> = ({
  flows, flowId, batchNumber, lookbackMinutes, branchId, running, error,
  onFlowChange, onBatchChange, onLookbackChange, onBranchChange, onRun, onOpenSettings
}) => {
  if (flows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Nenhum fluxo cadastrado</p>
        <p className="text-xs text-muted-foreground">
          Cadastre o fluxo de saída que você testa (ex.: produto ou preço) com a consulta que prova a chegada no PDV.
        </p>
        <button
          type="button"
          onClick={onOpenSettings}
          className="h-10 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          <span>Cadastrar fluxo</span>
        </button>
      </div>
    );
  }

  return (
    <form
      className="bg-card border border-border rounded-xl p-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!running) onRun();
      }}
    >
      <div className="space-y-1">
        <label htmlFor="trace-flow" className="text-xs font-bold text-foreground block">Fluxo</label>
        <select id="trace-flow" value={flowId} onChange={(e) => onFlowChange(e.target.value)} className={FIELD_CLASS}>
          {flows.map((flow) => (
            <option key={flow.id} value={flow.id}>{flow.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="trace-batch" className="text-xs font-bold text-foreground block">Número do lote</label>
        <input
          id="trace-batch"
          type="text"
          value={batchNumber}
          onChange={(e) => onBatchChange(e.target.value)}
          className={`${FIELD_CLASS} font-mono`}
          placeholder="48213"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-2xs text-muted-foreground">O número que o CH devolveu ao abrir o lote.</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="trace-lookback" className="text-xs font-bold text-foreground block">Janela de busca</label>
        <select id="trace-lookback" value={lookbackMinutes} onChange={(e) => onLookbackChange(parseInt(e.target.value, 10))} className={FIELD_CLASS}>
          {LOOKBACK_OPTIONS.map((option) => (
            <option key={option.minutes} value={option.minutes}>{option.label}</option>
          ))}
        </select>
        <p className="text-2xs text-muted-foreground">Vira o bind :inicio e o intervalo da busca no APM.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="trace-branch" className="text-xs font-bold text-foreground block">Filial (opcional)</label>
        <input
          id="trace-branch"
          type="text"
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
          className={`${FIELD_CLASS} font-mono`}
          placeholder="1"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-2xs text-muted-foreground">Mostra o status do lote só nessa loja no PDVSync. Vazio traz todas.</p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button
        type="submit"
        className="w-full h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        <span>{running ? 'Rastreando...' : 'Rastrear lote'}</span>
      </button>
    </form>
  );
};
