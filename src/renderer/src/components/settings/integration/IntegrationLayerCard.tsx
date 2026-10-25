import React from 'react';
import { AlertTriangle, FolderOpen } from 'lucide-react';
import type { DatabaseConnectionConfig, TrackedServiceConfig } from '../../../../../shared/types';
import {
  INTEGRATION_LAYER_LABELS,
  type IntegrationLayerAuth,
  type IntegrationLayerConfig
} from '../../../../../shared/integrationTypes';
import { isLayerConfigured, parsePortInput, validateLayer } from '../../../utils/integrationSettingsUtils';
import { INPUT_CLASS, IntegrationField } from './IntegrationField';
import { IntegrationLayerAuthFields } from './IntegrationLayerAuthFields';

interface IntegrationLayerCardProps {
  layer: IntegrationLayerConfig;
  connections: DatabaseConnectionConfig[];
  services: TrackedServiceConfig[];
  onPatch: (patch: Partial<IntegrationLayerConfig>) => void;
  onPatchAuth: (patch: Partial<IntegrationLayerAuth>) => void;
  onBrowseLog: () => void;
}

/** Banco que cada camada usa; as outras não têm campo de conexão. */
const DB_TYPE_BY_LAYER: Partial<Record<IntegrationLayerConfig['layer'], DatabaseConnectionConfig['type']>> = {
  winthor: 'oracle',
  pdv: 'postgres'
};

export const IntegrationLayerCard: React.FC<IntegrationLayerCardProps> = ({
  layer,
  connections,
  services,
  onPatch,
  onPatchAuth,
  onBrowseLog
}) => {
  const idPrefix = `integration-layer-${layer.layer}`;
  const dbType = DB_TYPE_BY_LAYER[layer.layer];
  const dbOptions = dbType ? connections.filter((conn) => conn.type === dbType) : [];
  const issues = validateLayer(layer);
  const configured = isLayerConfigured(layer);

  return (
    <div className="bg-card/70 border border-border/80 rounded-xl p-4 space-y-3 hover:border-border transition-colors" id={`${idPrefix}-card`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold text-foreground">{INTEGRATION_LAYER_LABELS[layer.layer]}</h4>
        <span className={`text-2xs font-medium ${configured ? 'text-success' : 'text-muted-foreground'}`}>
          {configured ? 'Configurada' : 'Não configurada'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IntegrationField id={`${idPrefix}-baseUrl`} label="URL base" className="md:col-span-2" hint="Ex.: http://localhost:9000">
          <input
            id={`${idPrefix}-baseUrl`}
            type="text"
            value={layer.baseUrl || ''}
            onChange={(e) => onPatch({ baseUrl: e.target.value })}
            className={INPUT_CLASS}
            placeholder="http://localhost:porta"
          />
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-healthPath`} label="Caminho de health" hint="Sem isso, o pré-voo testa só a porta.">
          <input
            id={`${idPrefix}-healthPath`}
            type="text"
            value={layer.healthPath || ''}
            onChange={(e) => onPatch({ healthPath: e.target.value })}
            className={INPUT_CLASS}
            placeholder="/actuator/health"
          />
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-port`} label="Porta TCP">
          <input
            id={`${idPrefix}-port`}
            type="number"
            min={1}
            max={65535}
            value={layer.port ?? ''}
            onChange={(e) => onPatch({ port: parsePortInput(e.target.value) })}
            className={INPUT_CLASS}
          />
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-service`} label="Serviço Windows" hint="Nome do serviço, como em Serviços & Processos.">
          <input
            id={`${idPrefix}-service`}
            type="text"
            list={`${idPrefix}-service-options`}
            value={layer.windowsServiceName || ''}
            onChange={(e) => onPatch({ windowsServiceName: e.target.value })}
            className={INPUT_CLASS}
          />
          <datalist id={`${idPrefix}-service-options`}>
            {services.map((service) => (
              <option key={service.name} value={service.name}>
                {service.displayName}
              </option>
            ))}
          </datalist>
        </IntegrationField>
        <IntegrationField id={`${idPrefix}-process`} label="Processo" hint="Ex.: executável do PDV.">
          <input
            id={`${idPrefix}-process`}
            type="text"
            value={layer.processName || ''}
            onChange={(e) => onPatch({ processName: e.target.value })}
            className={INPUT_CLASS}
            placeholder="programa.exe"
          />
        </IntegrationField>
        {dbType && (
          <IntegrationField
            id={`${idPrefix}-db`}
            label={`Conexão ${dbType === 'oracle' ? 'Oracle' : 'Postgres'}`}
            hint={dbOptions.length === 0 ? 'Cadastre a conexão no DB Studio para escolhê-la aqui.' : undefined}
          >
            <select
              id={`${idPrefix}-db`}
              value={layer.dbConnectionId || ''}
              onChange={(e) => onPatch({ dbConnectionId: e.target.value || undefined })}
              className={INPUT_CLASS}
            >
              <option value="">Nenhuma</option>
              {dbOptions.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name}
                </option>
              ))}
            </select>
          </IntegrationField>
        )}
        <IntegrationField id={`${idPrefix}-log`} label="Arquivo de log" className={dbType ? 'md:col-span-2' : 'md:col-span-3'}>
          <div className="flex items-center gap-2">
            <input
              id={`${idPrefix}-log`}
              type="text"
              value={layer.logFilePath || ''}
              onChange={(e) => onPatch({ logFilePath: e.target.value })}
              className={INPUT_CLASS}
              placeholder="C:\caminho\do\servico.log"
            />
            <button
              type="button"
              onClick={onBrowseLog}
              className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Procurar...</span>
            </button>
          </div>
        </IntegrationField>
      </div>

      {layer.layer !== 'pdv' && <IntegrationLayerAuthFields idPrefix={idPrefix} auth={layer.auth} onChange={onPatchAuth} />}

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
