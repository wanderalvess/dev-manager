import React from 'react';
import { Database, Play, RotateCw } from 'lucide-react';
import {
  INFR_DEFAULT_ORACLE_CONTAINER,
  INFR_DEFAULT_ORACLE_PORT,
  infrBootstrapModalParsePort,
  infrBootstrapModalPreviewCommand
} from '../../../utils/infrBootstrapModalUtils';

interface InfrOracleTabProps {
  container: string;
  port: number;
  isExecuting: boolean;
  onContainerChange: (value: string) => void;
  onPortChange: (value: number) => void;
  onRun: () => void;
}

export const InfrOracleTab: React.FC<InfrOracleTabProps> = ({
  container,
  port,
  isExecuting,
  onContainerChange,
  onPortChange,
  onRun
}) => (
  <div className="space-y-4">
    <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning shrink-0 mt-0.5">
        <Database className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">
          Setup Automatizado do Oracle XE 11g
        </strong>
        Executa <code className="text-foreground font-mono">oracle_setup.sh</code> na pasta <code className="text-foreground font-mono">oracle-winthor</code>. Cria o container, monta volumes de persistência e inicia o listener na porta especificada.
      </div>
    </div>

    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-2xs font-semibold text-muted-foreground block mb-1">
            Nome do Container Oracle
          </label>
          <input
            type="text"
            value={container}
            onChange={(e) => onContainerChange(e.target.value)}
            placeholder="oracle-winthor"
            className="w-full bg-background border border-input/80 rounded-[10px] px-2.5 py-2.5 text-sm text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-warning"
          />
        </div>

        <div>
          <label className="text-2xs font-semibold text-muted-foreground block mb-1">
            Porta Externa do Host
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => onPortChange(infrBootstrapModalParsePort(e.target.value, INFR_DEFAULT_ORACLE_PORT))}
            placeholder="1521"
            className="w-full bg-background border border-input/80 rounded-[10px] px-2.5 py-2.5 text-sm text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-warning"
          />
        </div>
      </div>

      <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
        {infrBootstrapModalPreviewCommand(
          'oracle_setup.sh',
          container,
          port,
          INFR_DEFAULT_ORACLE_CONTAINER,
          INFR_DEFAULT_ORACLE_PORT
        )}
      </div>

      <button
        onClick={onRun}
        disabled={isExecuting}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-warning hover:bg-warning text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
      >
        {isExecuting ? (
          <RotateCw className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
        <span>{isExecuting ? 'Iniciando Setup...' : 'Executar Setup Oracle XE'}</span>
      </button>
    </div>
  </div>
);
