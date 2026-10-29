import React from 'react';
import { Bug, CheckCircle2, Circle, Loader2, Play, Plus, XCircle } from 'lucide-react';
import type { ApiScenario, ApiScenarioRunResult } from '../../../../../shared/apiScenarioTypes';

interface ApiScenarioListProps {
  scenarios: ApiScenario[];
  results: Record<string, ApiScenarioRunResult>;
  selectedId: string;
  running: boolean;
  onSelect: (scenario: ApiScenario | null) => void;
  onNewException: () => void;
  onRunAll: () => void;
}

const BUTTON = 'h-8 px-2.5 border border-border text-xs font-medium rounded-[10px] flex items-center gap-1.5 whitespace-nowrap transition-colors';

/** Cenários salvos com o resultado da última execução nesta sessão. */
export const ApiScenarioList: React.FC<ApiScenarioListProps> = ({ scenarios, results, selectedId, running, onSelect, onNewException, onRunAll }) => (
  <div className="bg-card border border-border rounded-xl">
    <div className="p-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
      <span className="text-sm font-semibold text-foreground whitespace-nowrap">Cenários ({scenarios.length})</span>
      <div className="flex gap-1.5 flex-wrap">
        <button type="button" onClick={() => onSelect(null)} className={`${BUTTON} bg-muted hover:bg-muted/80 text-foreground`}>
          <Plus className="w-3.5 h-3.5" />
          Novo
        </button>
        <button
          type="button"
          onClick={onNewException}
          className={`${BUTTON} bg-muted hover:bg-muted/80 text-foreground`}
          title="Modelo para exceção não mapeada: 4xx, erro em JSON, sem vazamento e registrado no log"
        >
          <Bug className="w-3.5 h-3.5" />
          Exceção
        </button>
        <button
          type="button"
          onClick={onRunAll}
          disabled={running || scenarios.length === 0}
          className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Roda todos os cenários salvos, um depois do outro"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Rodar todos
        </button>
      </div>
    </div>
    {scenarios.length === 0 ? (
      <p className="p-3 text-xs text-muted-foreground">
        Nenhum cenário salvo. Monte a requisição ao lado, escolha o que a resposta precisa ter e salve.
      </p>
    ) : (
      <ul className="divide-y divide-border max-h-[32rem] overflow-y-auto">
        {scenarios.map((scenario) => {
          const result = results[scenario.id];
          const Icon = !result ? Circle : result.success ? CheckCircle2 : XCircle;
          const tone = !result ? 'text-muted-foreground' : result.success ? 'text-success' : 'text-danger';
          return (
            <li key={scenario.id}>
              <button
                type="button"
                onClick={() => onSelect(scenario)}
                className={`w-full text-left p-3 flex items-start gap-2 hover:bg-muted/40 transition-colors ${scenario.id === selectedId ? 'bg-muted/60' : ''}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{scenario.name}</div>
                  <div className="text-2xs font-mono text-muted-foreground truncate">
                    {scenario.method} {scenario.url}
                  </div>
                  <div className="text-2xs text-muted-foreground">
                    {scenario.rules.length} regra(s){result ? ` · ${result.rules.filter((r) => r.passed).length} OK na última execução` : ''}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
