import React from 'react';
import type { ApiScenarioRunResult } from '../../../../../shared/apiScenarioTypes';
import { buildCurl } from '../../../../../shared/scenarioExports';
import { CopyButton } from '../scenarios/CopyButton';

interface ApiRequestBlockProps {
  request: ApiScenarioRunResult['request'];
}

/** A requisição que o Hub mandou, como cURL: o QA reproduz no terminal ou no Postman. O token sai como marcador. */
export const ApiRequestBlock: React.FC<ApiRequestBlockProps> = ({ request }) => {
  const curl = buildCurl(request);
  return (
    <div className="border-t border-border">
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          Requisição enviada{' '}
          <span className="font-mono text-muted-foreground">
            {request.method} {request.url}
          </span>
        </span>
        <CopyButton label="Copiar como cURL" done="cURL copiado (sem o token)." getText={() => curl} />
      </div>
      <pre className="mx-3 mb-2 p-2 rounded-lg bg-muted/40 text-2xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
        {curl}
      </pre>
      <p className="px-3 pb-2 text-2xs text-muted-foreground">
        O token nunca sai no cURL: vai como &lt;TOKEN_DO_WTA&gt;. Troque pelo seu antes de rodar.
      </p>
    </div>
  );
};
