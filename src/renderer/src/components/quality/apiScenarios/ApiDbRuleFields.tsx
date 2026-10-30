import React from 'react';
import type { ApiRule } from '../../../../../shared/apiScenarioTypes';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import { FIELD_CLASS } from '../lockout/lockoutFormFields';

interface ApiDbRuleFieldsProps {
  rule: ApiRule;
  connections: DatabaseConnectionConfig[];
  onChange: (patch: Partial<Pick<ApiRule, 'connectionId' | 'sql' | 'bindPath'>>) => void;
}

/** Campo × banco: em qual conexão, qual consulta e, se precisar, qual campo da resposta entra como :valor. */
export const ApiDbRuleFields: React.FC<ApiDbRuleFieldsProps> = ({ rule, connections, onChange }) => (
  <div className="ml-2 pl-3 border-l-2 border-border space-y-2">
    <div className="grid grid-cols-12 gap-2">
      <select
        aria-label="Conexão do banco"
        value={rule.connectionId ?? ''}
        onChange={(e) => onChange({ connectionId: e.target.value })}
        className={`${FIELD_CLASS} col-span-6 h-9`}
      >
        <option value="">Conexão do DB Studio…</option>
        {connections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.type}){c.isProduction ? ' — produção' : ''}
          </option>
        ))}
      </select>
      <input
        aria-label="Campo que vira :valor"
        value={rule.bindPath ?? ''}
        onChange={(e) => onChange({ bindPath: e.target.value })}
        placeholder=":valor vem de (ex.: $.codigo)"
        className={`${FIELD_CLASS} col-span-6 h-9 font-mono`}
        spellCheck={false}
      />
    </div>
    <textarea
      aria-label="Consulta do banco"
      value={rule.sql ?? ''}
      onChange={(e) => onChange({ sql: e.target.value })}
      rows={3}
      spellCheck={false}
      placeholder="SELECT FANTASIA FROM PCFILIAL WHERE CODIGO = :valor"
      className="w-full bg-card border border-border rounded-[10px] p-2 text-xs font-mono text-foreground focus:outline-hidden focus:border-primary"
    />
    <p className="text-2xs text-muted-foreground">
      Só SELECT. O valor do banco é a primeira coluna da primeira linha e vira o "esperado" da regra.
      {connections.length === 0 && ' Nenhuma conexão cadastrada: crie uma no Banco de Dados.'}
    </p>
  </div>
);
