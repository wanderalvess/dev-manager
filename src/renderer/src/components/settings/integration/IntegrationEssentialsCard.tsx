import React from 'react';
import { CheckCircle2, Database } from 'lucide-react';
import type { DatabaseConnectionConfig, DatabaseType } from '../../../../../shared/types';
import { INPUT_CLASS } from './IntegrationField';

interface IntegrationEssentialsCardProps {
  connections: DatabaseConnectionConfig[];
  connectionId?: string;
  onChange: (connectionId?: string) => void;
  /** Banco do PDV (camada PDV): opcional, o Monitor do WSH não usa. */
  pdvConnectionId?: string;
  onPdvChange: (connectionId?: string) => void;
}

interface ConnectionPickerProps {
  id: string;
  label: string;
  type: DatabaseType;
  connections: DatabaseConnectionConfig[];
  value?: string;
  onChange: (connectionId?: string) => void;
  status: (chosen: DatabaseConnectionConfig | undefined, count: number) => React.ReactNode;
}

const ConnectionPicker: React.FC<ConnectionPickerProps> = ({ id, label, type, connections, value, onChange, status }) => {
  const options = connections.filter((conn) => conn.type === type);
  const chosen = options.find((conn) => conn.id === value);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[18rem] flex-1 max-w-md">
        <label htmlFor={id} className="block font-bold text-foreground mb-1 text-xs">
          {label}
        </label>
        <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} className={INPUT_CLASS}>
          <option value="">Nenhuma</option>
          {options.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.name}
            </option>
          ))}
        </select>
      </div>
      <p className={`text-xs pb-2 flex items-center gap-1.5 ${chosen ? 'text-success' : 'text-muted-foreground'}`}>{status(chosen, options.length)}</p>
    </div>
  );
};

/**
 * O essencial da aba: o Monitor do WSH só precisa saber em qual Oracle o WSH grava (a PCINTEGRACAOCORE), gravado na
 * camada WinThor. Logo abaixo, opcional, o Postgres do PDV (camada PDV), o mesmo campo que o pré-voo mostra na camada.
 */
export const IntegrationEssentialsCard: React.FC<IntegrationEssentialsCardProps> = ({
  connections,
  connectionId,
  onChange,
  pdvConnectionId,
  onPdvChange
}) => (
  <div className="cockpit-panel rounded-xl p-5 space-y-3 border border-border" id="field-integrationEssentials">
    <div>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" /> Monitor do WSH: o essencial
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        O Monitor do WSH lê o que o WSH gravou na PCINTEGRACAOCORE. Basta escolher o Oracle onde o WSH grava, o mesmo da retaguarda.
        Sem senha nem chave do PDVSync.
      </p>
    </div>
    <ConnectionPicker
      id="integration-wsh-connection"
      label="Conexão Oracle do WSH"
      type="oracle"
      connections={connections}
      value={connectionId}
      onChange={onChange}
      status={(chosen, count) =>
        chosen ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" /> Pronto: o monitor usa a conexão {chosen.name}.
          </>
        ) : count === 0 ? (
          'Cadastre a conexão Oracle no Banco de Dados (DB Studio) para escolhê-la aqui.'
        ) : (
          'Escolha a conexão para o Monitor do WSH funcionar.'
        )
      }
    />
    <ConnectionPicker
      id="integration-pdv-connection"
      label="Conexão Postgres do PDV (opcional)"
      type="postgres"
      connections={connections}
      value={pdvConnectionId}
      onChange={onPdvChange}
      status={(chosen, count) =>
        chosen ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" /> O pré-voo e o Rastrear lote usam {chosen.name} para conferir o banco do PDV.
          </>
        ) : count === 0 ? (
          'Cadastre a conexão Postgres do PDV no Banco de Dados (DB Studio) para escolhê-la aqui.'
        ) : (
          'Opcional: o pré-voo testa o banco e o Rastrear lote confirma a chegada nele.'
        )
      }
    />
  </div>
);
