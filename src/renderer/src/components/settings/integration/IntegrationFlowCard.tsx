import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { IntegrationFlowDefinition } from '../../../../../shared/integrationTypes';
import { validateFlow } from '../../../utils/integrationSettingsUtils';
import { INPUT_CLASS, IntegrationField } from './IntegrationField';

interface IntegrationFlowCardProps {
  flow: IntegrationFlowDefinition;
  index: number;
  onPatch: (patch: Partial<IntegrationFlowDefinition>) => void;
  onRemove: () => void;
}

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[72px] resize-y`;

export const IntegrationFlowCard: React.FC<IntegrationFlowCardProps> = ({ flow, index, onPatch, onRemove }) => {
  const id = `integration-flow-${index}`;
  const issues = validateFlow(flow);
  const trigger = flow.trigger ?? { method: 'POST' as const, path: '' };
  const patchTrigger = (patch: Partial<IntegrationFlowDefinition['trigger']>) => onPatch({ trigger: { ...trigger, ...patch } });
  const patchEvidence = (patch: Partial<IntegrationFlowDefinition['evidence']>) =>
    onPatch({ evidence: { ...flow.evidence, ...patch } });
  const patchMarkers = (patch: NonNullable<IntegrationFlowDefinition['logMarkers']>) =>
    onPatch({ logMarkers: { ...flow.logMarkers, ...patch } });

  return (
    <div className="bg-card/70 border border-border/80 rounded-xl p-4 space-y-3 hover:border-border transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IntegrationField id={`${id}-name`} label="Nome do fluxo">
          <input id={`${id}-name`} type="text" value={flow.name} onChange={(e) => onPatch({ name: e.target.value })} className={INPUT_CLASS} placeholder="Produto" />
        </IntegrationField>
        <IntegrationField id={`${id}-batchType`} label="Tipo de lote no CH, opcional" hint="Só referência: o rastreio consulta o lote pelo número.">
          <input id={`${id}-batchType`} type="text" value={flow.chBatchType} onChange={(e) => onPatch({ chBatchType: e.target.value })} className={INPUT_CLASS} />
        </IntegrationField>
        <IntegrationField id={`${id}-winthorApi`} label="API do fluxo no WinThor" hint="Caminho chamado pelo WSH (evidência do passo 3).">
          <input id={`${id}-winthorApi`} type="text" value={flow.winthorApiPath || ''} onChange={(e) => onPatch({ winthorApiPath: e.target.value })} className={INPUT_CLASS} placeholder="/winthor/integracao/.../produtos" />
        </IntegrationField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <IntegrationField id={`${id}-trigger-method`} label="Disparo no WSH">
          <select id={`${id}-trigger-method`} value={trigger.method} onChange={(e) => patchTrigger({ method: e.target.value as 'GET' | 'POST' })} className={INPUT_CLASS}>
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </IntegrationField>
        <IntegrationField id={`${id}-trigger-path`} label="Caminho do disparo" className="md:col-span-3" hint="Relativo à URL base do WSH. Deixe vazio enquanto o WSH não expuser um disparo por API.">
          <input id={`${id}-trigger-path`} type="text" value={trigger.path} onChange={(e) => patchTrigger({ path: e.target.value })} className={INPUT_CLASS} placeholder="/fluxos/produto/executar" />
        </IntegrationField>
      </div>
      {trigger.method === 'POST' && (
        <IntegrationField id={`${id}-trigger-body`} label="Corpo do disparo (JSON)">
          <textarea id={`${id}-trigger-body`} value={trigger.body || ''} onChange={(e) => patchTrigger({ body: e.target.value })} className={TEXTAREA_CLASS} spellCheck={false} />
        </IntegrationField>
      )}

      <IntegrationField id={`${id}-pdvQuery`} label="Consulta de evidência no PDV (Postgres), opcional" hint="Confirma no banco do PDV o que o PDVSync já informa por loja; só SELECT. Binds de texto: :lote, :inicio e :fim (AAAA-MM-DD HH:MM:SS, hora local). Com count(*) vale o número; senão, as linhas.">
        <textarea id={`${id}-pdvQuery`} value={flow.evidence.pdvQuery} onChange={(e) => patchEvidence({ pdvQuery: e.target.value })} className={TEXTAREA_CLASS} spellCheck={false} placeholder="select count(*) from ... where lote = :lote" />
      </IntegrationField>
      <IntegrationField id={`${id}-oracleQuery`} label="Consulta de evidência no WinThor (Oracle), opcional" hint="O dado existe na retaguarda? Mesmos binds e regras; no Oracle use TO_DATE(:inicio, 'YYYY-MM-DD HH24:MI:SS').">
        <textarea id={`${id}-oracleQuery`} value={flow.evidence.oracleQuery || ''} onChange={(e) => patchEvidence({ oracleQuery: e.target.value })} className={TEXTAREA_CLASS} spellCheck={false} />
      </IntegrationField>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <IntegrationField id={`${id}-wait`} label="Espera pela descida (s)">
          <input id={`${id}-wait`} type="number" min={1} value={flow.evidence.pdvWaitSeconds} onChange={(e) => patchEvidence({ pdvWaitSeconds: parseInt(e.target.value, 10) || 0 })} className={INPUT_CLASS} />
        </IntegrationField>
        <IntegrationField id={`${id}-itemsPath`} label="JSONPath dos itens" hint="Onde contar itens no retorno do WinThor.">
          <input id={`${id}-itemsPath`} type="text" value={flow.evidence.expectedItemsJsonPath || ''} onChange={(e) => patchEvidence({ expectedItemsJsonPath: e.target.value })} className={INPUT_CLASS} placeholder="$.data" />
        </IntegrationField>
        <IntegrationField id={`${id}-marker-wsh`} label="Marcador no log do WSH" hint="Texto além do nº do lote.">
          <input id={`${id}-marker-wsh`} type="text" value={flow.logMarkers?.wsh || ''} onChange={(e) => patchMarkers({ wsh: e.target.value })} className={INPUT_CLASS} />
        </IntegrationField>
        <IntegrationField id={`${id}-marker-ch`} label="Marcador no log do CH">
          <input id={`${id}-marker-ch`} type="text" value={flow.logMarkers?.ch || ''} onChange={(e) => patchMarkers({ ch: e.target.value })} className={INPUT_CLASS} />
        </IntegrationField>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input type="checkbox" checked={flow.enabled !== false} onChange={(e) => onPatch({ enabled: e.target.checked })} className="rounded border-border" />
          <span>Fluxo ativo</span>
        </label>
        <button type="button" onClick={onRemove} className="text-xs text-danger font-semibold flex items-center gap-1 p-1 hover:bg-danger/10 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remover</span>
        </button>
      </div>

      {issues.length > 0 && (
        <ul className="text-2xs text-danger space-y-0.5" role="alert">
          {issues.map((issue) => (
            <li key={issue} className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
