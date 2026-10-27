import React from 'react';
import { CheckCircle2, Database } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import { INPUT_CLASS } from './IntegrationField';

interface IntegrationEssentialsCardProps {
  connections: DatabaseConnectionConfig[];
  connectionId?: string;
  onChange: (connectionId?: string) => void;
}

/**
 * O essencial da aba: o Monitor do WSH só precisa saber em qual Oracle o WSH grava (a PCINTEGRACAOCORE).
 * Fica gravado na camada WinThor, que é o mesmo banco da retaguarda.
 */
export const IntegrationEssentialsCard: React.FC<IntegrationEssentialsCardProps> = ({ connections, connectionId, onChange }) => {
  const oracle = connections.filter((conn) => conn.type === 'oracle');
  const chosen = oracle.find((conn) => conn.id === connectionId);
  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-3 shadow-xl border border-border" id="field-integrationEssentials">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> Monitor do WSH: o essencial
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          O Monitor do WSH lê o que o WSH gravou na PCINTEGRACAOCORE. Basta escolher o Oracle onde o WSH grava, o mesmo da retaguarda.
          Sem senha nem chave do PDVSync.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[18rem] flex-1 max-w-md">
          <label htmlFor="integration-wsh-connection" className="block font-bold text-foreground mb-1 text-xs">
            Conexão Oracle do WSH
          </label>
          <select
            id="integration-wsh-connection"
            value={connectionId || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={INPUT_CLASS}
          >
            <option value="">Nenhuma</option>
            {oracle.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name}
              </option>
            ))}
          </select>
        </div>
        <p className={`text-xs pb-2 flex items-center gap-1.5 ${chosen ? 'text-success' : 'text-muted-foreground'}`}>
          {chosen ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" /> Pronto: o monitor usa a conexão {chosen.name}.
            </>
          ) : oracle.length === 0 ? (
            'Cadastre a conexão Oracle no Banco de Dados (DB Studio) para escolhê-la aqui.'
          ) : (
            'Escolha a conexão para o Monitor do WSH funcionar.'
          )}
        </p>
      </div>
    </div>
  );
};
