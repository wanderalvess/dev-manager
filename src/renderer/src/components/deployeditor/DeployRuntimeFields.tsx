import React from 'react';
import { FolderOpen } from 'lucide-react';
import { parseIntMin } from '../../utils/deployEditorUtils';
import type { StepFieldsProps } from './deployEditorStepTypes';

type RuntimeFieldsProps = Pick<StepFieldsProps, 'step' | 'onUpdate'>;

export const DeployCommandFields: React.FC<StepFieldsProps> = ({
  step,
  onUpdate,
  onSelectDirectory
}) => (
  <>
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Comando de Execução
      </label>
      <input
        type="text"
        value={step.command || ''}
        onChange={(e) => onUpdate({ command: e.target.value })}
        placeholder="Ex: npm run deploy, .\deploy.bat, gradlew deployProd"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
    </div>
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-muted-foreground">
          Diretório de Trabalho (CWD)
        </label>
        <button
          type="button"
          onClick={() => onSelectDirectory('cwd')}
          className="text-[11px] text-primary hover:underline flex items-center gap-1"
        >
          <FolderOpen className="w-3 h-3" /> Procurar Pasta
        </button>
      </div>
      <input
        type="text"
        value={step.cwd || ''}
        onChange={(e) => onUpdate({ cwd: e.target.value })}
        placeholder="Ex: C:\projetos\minha-api"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
    </div>
  </>
);

export const DeployWaitFields: React.FC<RuntimeFieldsProps> = ({ step, onUpdate }) => (
  <div>
    <label className="block text-xs font-semibold text-muted-foreground mb-1">
      Tempo de Espera (em segundos)
    </label>
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={1}
        max={600}
        value={step.waitDurationSeconds ?? 5}
        onChange={(e) => onUpdate({ waitDurationSeconds: parseIntMin(e.target.value, 1) })}
        className="w-32 bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
      />
      <span className="text-xs text-muted-foreground">
        A esteira pausará com contagem regressiva em tempo real no console.
      </span>
    </div>
  </div>
);

export const DeployHealthcheckFields: React.FC<RuntimeFieldsProps> = ({ step, onUpdate }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        URL do Endpoint HTTP
      </label>
      <input
        type="text"
        value={step.healthcheckUrl || ''}
        onChange={(e) => onUpdate({ healthcheckUrl: e.target.value })}
        placeholder="Ex: http://localhost:8080/cxf/healthcheck ou http://localhost:8889"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Status Esperado
        </label>
        <input
          type="number"
          value={step.healthcheckExpectedStatus ?? 200}
          onChange={(e) => onUpdate({ healthcheckExpectedStatus: parseInt(e.target.value) || 200 })}
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Timeout (s)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={step.healthcheckTimeoutSeconds ?? 5}
          onChange={(e) => onUpdate({ healthcheckTimeoutSeconds: parseIntMin(e.target.value, 5) })}
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Tentativas
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={step.healthcheckRetries ?? 10}
          onChange={(e) => onUpdate({ healthcheckRetries: parseIntMin(e.target.value, 10) })}
          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
    <p className="text-[11px] text-muted-foreground">
      Realiza requisições periódicas a cada 2 segundos até o endpoint responder com o código esperado ou esgotar as tentativas.
    </p>
  </div>
);

export const DeployServiceFields: React.FC<RuntimeFieldsProps> = ({ step, onUpdate }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Ação no Serviço
      </label>
      <select
        value={step.serviceAction || 'start'}
        onChange={(e) => onUpdate({ serviceAction: e.target.value as typeof step.serviceAction })}
        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      >
        <option value="start">Iniciar Serviço (start)</option>
        <option value="stop">Parar Serviço (stop)</option>
        <option value="restart">Reiniciar Serviço (restart)</option>
      </select>
    </div>
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Nome do Serviço Windows
      </label>
      <input
        type="text"
        value={step.serviceName || ''}
        onChange={(e) => onUpdate({ serviceName: e.target.value })}
        placeholder="Ex: OracleServiceXE, postgresql-x64-15, Winthor-Karaf"
        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      />
      <p className="text-[11px] text-muted-foreground mt-1">
        Nome de identificação do serviço no Windows (conforme exibido em services.msc).
      </p>
    </div>
  </div>
);
