import React, { useMemo } from 'react';
import { ExternalLink, Lightbulb, Loader2 } from 'lucide-react';
import type { WshItem } from '../../../../../shared/wshMonitorTypes';
import { suggestionFields, suggestWshFixes } from '../../../../../shared/wshSuggestions';
import type { WshDependenciesState } from '../../../hooks/integration/useWshDependencies';
import { useWshLayout } from '../../../hooks/integration/useWshLayout';

const openDoc = (url: string) => {
  if (window.electronAPI?.openExternal) void window.electronAPI.openExternal(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
};

interface WshFixPanelProps {
  item: WshItem;
  deps: WshDependenciesState | null;
}

/**
 * "Como resolver": o que fazer, em ordem (nível 1, regras sobre os erros, o catálogo e as dependências) e como o
 * JOLT do WSH monta o campo recusado (nível 2, lido do próprio Oracle). Nunca afirma causa que os dados não mostram.
 */
export const WshFixPanel: React.FC<WshFixPanelProps> = ({ item, deps }) => {
  const dependencies = deps && !deps.loading ? deps.dependencies : undefined;
  const suggestions = useMemo(() => suggestWshFixes(item, dependencies), [item, dependencies]);
  const fields = suggestionFields(suggestions);
  const itemIds = [...new Set([...item.ownErrors, ...item.otherErrors].map((error) => error.externalId).filter((id): id is string => Boolean(id)))];
  const routes = [item.route, item.sendRoute].filter((route): route is string => Boolean(route));
  const layout = useWshLayout(routes, fields, itemIds);

  if (suggestions.length === 0) return null;
  const withRules = layout && !layout.loading ? layout.layouts.filter((entry) => entry.fields.some((f) => f.mappings.length > 0)) : [];

  return (
    <section className="border border-warning/40 bg-warning/5 rounded-xl p-3 space-y-3" aria-label="Como resolver">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-warning" /> Como resolver
      </h3>
      <ol className="space-y-2 list-decimal pl-5">
        {suggestions.map((suggestion, index) => (
          <li key={`${suggestion.kind}-${index}`} className="text-xs text-foreground">
            <p className="font-semibold">{suggestion.title}</p>
            <p className="text-muted-foreground">{suggestion.detail}</p>
            {suggestion.docUrl && (
              <button type="button" onClick={() => openDoc(suggestion.docUrl!)} className="mt-0.5 text-primary hover:underline inline-flex items-center gap-1">
                Abrir a documentação do PDVSync (TDN) <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </li>
        ))}
      </ol>

      {fields.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Como o WSH monta {fields.map((f) => `"${f}"`).join(', ')}</p>
          {layout?.loading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Lendo o layout das rotas no Oracle...
            </p>
          )}
          {layout && !layout.loading && layout.error && <p className="text-xs text-danger">{layout.error}</p>}
          {layout && !layout.loading && !layout.error && withRules.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma regra do layout escreve nesse campo: ele vem pronto da origem.</p>
          )}
          {withRules.map((entry) => (
            <div key={entry.route} className="space-y-1">
              <p className="text-2xs text-muted-foreground">Rota {entry.route} (LAYOUTTRANSFORMACAO)</p>
              {entry.fields.map((f) =>
                f.mappings.length === 0 ? null : (
                  <ul key={f.field} className="space-y-0.5">
                    {f.mappings.map((mapping, index) => (
                      <li
                        key={index}
                        className={`text-2xs font-mono rounded px-2 py-1 break-words ${mapping.matches.length ? 'bg-warning/15 text-foreground' : 'text-muted-foreground'}`}
                      >
                        {mapping.path.length ? mapping.path.join(' › ') : '(qualquer item)'} → {f.field}
                        {mapping.value === undefined
                          ? ` = valor de ${mapping.target}`
                          : mapping.literalText
                            ? ` = "${mapping.value}"${mapping.convertedBy ? ` (texto; convertido por ${mapping.convertedBy})` : ' (texto)'}`
                            : ` = ${mapping.value}${mapping.wshVariable ? ' (variável do WSH)' : ''}`}
                        <span className="text-muted-foreground"> · passo {mapping.step} ({mapping.operation})</span>
                        {mapping.matches.length > 0 && <span className="font-sans font-semibold"> · vale para {mapping.matches.join(', ')}</span>}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
