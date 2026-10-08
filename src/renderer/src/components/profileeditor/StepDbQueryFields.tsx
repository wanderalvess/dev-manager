import React from 'react';
import type { AutomationStep, DatabaseConnectionConfig } from '../../../../shared/types';

interface StepDbQueryFieldsProps {
  step: AutomationStep;
  dbConnections: DatabaseConnectionConfig[];
  onUpdate: (fields: Partial<AutomationStep>) => void;
}

export const StepDbQueryFields: React.FC<StepDbQueryFieldsProps> = ({
  step,
  dbConnections,
  onUpdate
}) => (
  <>
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Conexão de Banco de Dados
      </label>
      <select
        value={step.dbConnectionId || ''}
        onChange={(e) => onUpdate({ dbConnectionId: e.target.value })}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      >
        <option value="">Selecione uma conexão salva...</option>
        {dbConnections.map((conn) => (
          <option key={conn.id} value={conn.id}>
            {conn.name} ({conn.type})
          </option>
        ))}
      </select>
      {dbConnections.length === 0 && (
        <p className="text-2xs text-amber-500 mt-1">
          Nenhuma conexão salva. Cadastre uma na página "Banco de Dados" primeiro.
        </p>
      )}
    </div>

    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        SQL a Executar
      </label>
      <textarea
        value={step.sql || ''}
        onChange={(e) => onUpdate({ sql: e.target.value })}
        rows={5}
        placeholder={`UPDATE tb_parametro SET valor = '{{localIp}}' WHERE parametro LIKE 'IP';`}
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
      <p className="text-2xs text-muted-foreground mt-1">
        Placeholders disponíveis: <code className="font-mono">{'{{localIp}}'}</code> (IP local da
        máquina) e <code className="font-mono">{'{{wslIp}}'}</code> (IP da distro WSL ativa).
      </p>
    </div>
  </>
);
