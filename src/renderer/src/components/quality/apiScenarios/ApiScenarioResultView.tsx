import React from 'react';
import { CheckCircle2, ClipboardCopy, XCircle } from 'lucide-react';
import type { ApiScenarioRunResult } from '../../../../../shared/apiScenarioTypes';

interface ApiScenarioResultViewProps {
  result: ApiScenarioRunResult;
  onCopyReport: () => void;
}

/** O confronto regra a regra (esperado x obtido) e a resposta que a API devolveu. */
export const ApiScenarioResultView: React.FC<ApiScenarioResultViewProps> = ({ result, onCopyReport }) => {
  const passed = result.rules.filter((r) => r.passed).length;
  const r = result.response;
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="p-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {result.success ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-danger" />}
          <span className="text-sm font-semibold text-foreground">
            {result.error ? 'Não rodou' : result.success ? 'OK' : 'Falhou'}
            {!result.error && ` — ${passed} de ${result.rules.length} regra(s)`}
          </span>
          {r && (
            <span className="text-2xs font-mono text-muted-foreground">
              {r.status ? `HTTP ${r.status}` : 'sem resposta'} · {r.durationMs} ms{r.isJson ? ' · JSON' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onCopyReport}
          className="h-8 px-3 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-medium rounded-[10px] flex items-center gap-1.5"
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
          Copiar relatório (Jira)
        </button>
      </div>
      {result.error && <p className="p-3 text-xs text-danger">{result.error}</p>}
      {result.rules.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="p-2 pl-3 font-medium">Regra</th>
              <th className="p-2 font-medium">Esperado</th>
              <th className="p-2 font-medium">Obtido</th>
              <th className="p-2 pr-3 font-medium w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.rules.map((rule) => (
              <tr key={rule.ruleId} className={rule.passed ? '' : 'bg-danger/5'}>
                <td className="p-2 pl-3 text-foreground">{rule.label}</td>
                <td className="p-2 font-mono text-muted-foreground break-all">{rule.expected}</td>
                <td className={`p-2 font-mono break-all ${rule.passed ? 'text-foreground' : 'text-danger'}`}>{rule.actual}</td>
                <td className="p-2 pr-3">
                  {rule.passed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-danger" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {r && Object.keys(r.headers ?? {}).length > 0 && (
        <details className="border-t border-border">
          <summary className="px-3 py-2 text-xs font-medium text-foreground cursor-pointer">Cabeçalhos da resposta ({Object.keys(r.headers).length})</summary>
          <dl className="px-3 pb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-2xs font-mono">
            {Object.entries(r.headers).map(([name, value]) => (
              <React.Fragment key={name}>
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="text-foreground break-all">{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </details>
      )}
      {r?.body && (
        <details className="border-t border-border">
          <summary className="px-3 py-2 text-xs font-medium text-foreground cursor-pointer">Corpo da resposta (tokens mascarados)</summary>
          <pre className="px-3 pb-3 text-2xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-80 overflow-y-auto">{r.body}</pre>
        </details>
      )}
    </div>
  );
};
