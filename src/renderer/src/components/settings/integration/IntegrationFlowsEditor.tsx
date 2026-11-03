import React from 'react';
import { Plus, Route, Sparkles } from 'lucide-react';
import type { IntegrationFlowDefinition } from '../../../../../shared/integrationTypes';
import { IntegrationFlowCard } from './IntegrationFlowCard';

interface IntegrationFlowsEditorProps {
  flows: IntegrationFlowDefinition[];
  onAdd: () => void;
  onPatch: (index: number, patch: Partial<IntegrationFlowDefinition>) => void;
  onRemove: (index: number) => void;
}

export const IntegrationFlowsEditor: React.FC<IntegrationFlowsEditorProps> = ({ flows, onAdd, onPatch, onRemove }) => (
  <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border" id="field-integrationFlows">
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Route className="w-4 h-4 text-primary" /> Fluxos do WSH
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cada fluxo diz que tipo de lote abre no CH e como provar que o dado chegou ao PDV.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Adicionar fluxo</span>
      </button>
    </div>

    {flows.length === 0 ? (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Nenhum fluxo cadastrado. Comece pelo fluxo de saída que você mais testa, como produto ou preço. A venda é de entrada e não usa lote.
      </p>
    ) : (
      <div className="space-y-3">
        {flows.map((flow, index) => (
          <IntegrationFlowCard key={flow.id} flow={flow} index={index} onPatch={(patch) => onPatch(index, patch)} onRemove={() => onRemove(index)} />
        ))}
      </div>
    )}

    <div className="bg-muted/30 border border-border/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
      <span className="font-bold text-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" /> Como o rastreio usa isso
      </span>
      <p>
        O número do lote devolvido pelo CH é o fio que liga as camadas: ele entra nos binds das consultas de evidência e no filtro
        dos logs. Preencha o disparo e os caminhos conforme for descobrindo as APIs do WSH e do CH; o que ficar vazio aparece no
        rastreio como &quot;sem evidência&quot;, nunca como ok.
      </p>
    </div>
  </div>
);
