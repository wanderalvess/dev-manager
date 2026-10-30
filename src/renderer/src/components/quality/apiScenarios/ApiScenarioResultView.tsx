import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, XCircle } from 'lucide-react';
import type { ApiScenarioRunResult } from '../../../../../shared/apiScenarioTypes';
import { EXPOSURE_LABELS } from '../../../../../shared/authLockoutAnalysis';
import { headersToText, reportFileName } from '../../../../../shared/scenarioExports';
import { CopyButton, DownloadMdButton } from '../scenarios/CopyButton';
import { ApiRequestBlock } from './ApiRequestBlock';

interface ApiScenarioResultViewProps {
  result: ApiScenarioRunResult;
}

interface SectionProps {
  title: string;
  action: React.ReactNode;
  children: React.ReactNode;
}

/** Bloco recolhível com o botão de copiar ao lado do título (dentro de um <summary> o clique abriria o bloco). */
function Section({ title, action, children }: SectionProps) {
  const [open, setOpen] = useState(false);
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex-1 px-3 py-2 text-xs font-medium text-foreground flex items-center gap-1.5 text-left"
        >
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          {title}
        </button>
        {action}
      </div>
      {open && children}
    </div>
  );
}

/** O confronto regra a regra (esperado x obtido), a requisição enviada e a resposta que a API devolveu. */
export const ApiScenarioResultView: React.FC<ApiScenarioResultViewProps> = ({ result }) => {
  const passed = result.rules.filter((r) => r.passed).length;
  const leaks = (result.exposure ?? []).filter((f) => f !== 'server-version');
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
              {r.status ? `HTTP ${r.status}` : 'sem resposta'} · {r.durationMs} ms{r.isJson ? ' · JSON' : ''} · {result.requestId}
            </span>
          )}
          {/* O identificador é o que o QA procura no winthor.log e cita no Jira */}
          {result.requestId && (
            <CopyButton iconOnly label="Copiar identificador da execução" done="Identificador copiado." getText={() => result.requestId} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <DownloadMdButton fileName={reportFileName(result.scenarioName, result.startedAt)} getText={() => result.markdown} disabled={!result.markdown} />
          <CopyButton label="Copiar relatório (Jira)" done="Relatório copiado (Markdown para o Jira)." getText={() => result.markdown} />
        </div>
      </div>
      {result.error && <p className="p-3 text-xs text-danger">{result.error}</p>}
      {leaks.length > 0 && (
        <p className="px-3 py-2 text-xs text-danger bg-danger/5 border-b border-border">
          A resposta expõe: {leaks.map((f) => EXPOSURE_LABELS[f]).join(', ')}.
        </p>
      )}
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
      {result.request && <ApiRequestBlock request={result.request} />}
      {r && Object.keys(r.headers ?? {}).length > 0 && (
        <Section
          title={`Cabeçalhos da resposta (${Object.keys(r.headers).length})`}
          action={<CopyButton label="Copiar cabeçalhos" done="Cabeçalhos copiados." getText={() => headersToText(r.headers)} />}
        >
          <dl className="px-3 pb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-2xs font-mono">
            {Object.entries(r.headers).map(([name, value]) => (
              <React.Fragment key={name}>
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="text-foreground break-all">{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </Section>
      )}
      {r?.body && (
        <Section
          title="Corpo da resposta (tokens mascarados)"
          action={<CopyButton label="Copiar corpo" done="Corpo da resposta copiado." getText={() => r.body ?? ''} />}
        >
          <pre className="px-3 pb-3 text-2xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-80 overflow-y-auto">{r.body}</pre>
        </Section>
      )}
    </div>
  );
};
