import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import type { IntegrationLayerConfig, IntegrationPdvSyncEndpoints } from '../../../../../shared/integrationTypes';
import { matchEnvironment, PDVSYNC_ENVIRONMENTS, type PdvSyncEnvironmentId } from '../../../../../shared/pdvSyncBatch';
import { missingLookupFields } from '../../../../../shared/pdvSyncConfig';
import { INPUT_CLASS, IntegrationField } from './IntegrationField';

interface PdvSyncEndpointsFieldsProps {
  idPrefix: string;
  layer: IntegrationLayerConfig;
  onChange: (patch: Partial<IntegrationPdvSyncEndpoints>) => void;
}

const CUSTOM = 'custom';

/**
 * Onde consultar o lote no PDVSync (CH): login, inquilino e os dois endereços de consulta. O atalho de ambiente preenche
 * os endereços de produção ou homologação dos layouts do WSH; um ambiente local usa endereços próprios.
 */
export const PdvSyncEndpointsFields: React.FC<PdvSyncEndpointsFieldsProps> = ({ idPrefix, layer, onChange }) => {
  const endpoints = layer.pdvsync ?? {};
  const environment = matchEnvironment(endpoints.batchStatusUrl, endpoints.storeStatusUrl);
  // Os segredos chegam vazios do servidor, só com o sinal de que estão salvos
  const missing = missingLookupFields(layer, true);

  const applyEnvironment = (value: string) => {
    const preset = PDVSYNC_ENVIRONMENTS.find((env) => env.id === (value as PdvSyncEnvironmentId));
    if (preset) onChange({ batchStatusUrl: preset.batchStatusUrl, storeStatusUrl: preset.storeStatusUrl });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border/60" id={`${idPrefix}-pdvsync`}>
      <p className="text-xs font-semibold text-foreground">Consulta de lote no PDVSync</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IntegrationField id={`${idPrefix}-pdvsync-racUrl`} label="Endereço do login (RAC)" className="md:col-span-2" hint="O mesmo da variável URL_RAC_PDVSYNC do WSH.">
          <input
            id={`${idPrefix}-pdvsync-racUrl`}
            type="text"
            value={endpoints.racUrl || ''}
            onChange={(e) => onChange({ racUrl: e.target.value })}
            className={INPUT_CLASS}
            placeholder="https://.../connect/token"
          />
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-pdvsync-tenantId`} label="Inquilino" hint="Código usado nos caminhos da API de lote.">
          <input
            id={`${idPrefix}-pdvsync-tenantId`}
            type="text"
            value={endpoints.tenantId || ''}
            onChange={(e) => onChange({ tenantId: e.target.value })}
            className={INPUT_CLASS}
            autoComplete="off"
          />
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-pdvsync-env`} label="Atalho de ambiente" hint="Preenche os dois endereços abaixo.">
          <select
            id={`${idPrefix}-pdvsync-env`}
            value={environment ?? CUSTOM}
            onChange={(e) => applyEnvironment(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value={CUSTOM}>Personalizado</option>
            {PDVSYNC_ENVIRONMENTS.map((env) => (
              <option key={env.id} value={env.id}>
                {env.label}
              </option>
            ))}
          </select>
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-pdvsync-batchUrl`} label="Consultar lote (LoteExternoRetornos)" className="md:col-span-2">
          <input
            id={`${idPrefix}-pdvsync-batchUrl`}
            type="text"
            value={endpoints.batchStatusUrl || ''}
            onChange={(e) => onChange({ batchStatusUrl: e.target.value })}
            className={INPUT_CLASS}
            placeholder="https://.../LoteExternoRetornos"
          />
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-pdvsync-storeUrl`} label="Status por loja (LojaLoteStatusretorno)" className="md:col-span-3" hint="Opcional. Sem ele, só o status do lote inteiro é usado.">
          <input
            id={`${idPrefix}-pdvsync-storeUrl`}
            type="text"
            value={endpoints.storeStatusUrl || ''}
            onChange={(e) => onChange({ storeStatusUrl: e.target.value })}
            className={INPUT_CLASS}
            placeholder="https://.../LojaLoteStatusretorno"
          />
        </IntegrationField>
      </div>

      {missing.length === 0 ? (
        <p className="text-2xs text-success flex items-center gap-1" role="status">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Configuração completa: o rastreio consulta o lote no PDVSync.</span>
        </p>
      ) : (
        <p className="text-2xs text-muted-foreground flex items-start gap-1" role="status">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Para consultar o lote faltam: {missing.join(', ')}. Sem isso o rastreio não usa o PDVSync.</span>
        </p>
      )}
    </div>
  );
};
