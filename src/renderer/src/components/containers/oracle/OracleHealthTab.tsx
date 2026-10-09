import React from 'react';
import { Activity, Shield, Wrench } from 'lucide-react';
import type { OracleMaintenanceModalState } from '../../../hooks/containers/useOracleMaintenanceModal';
import { OracleCopyOutputButton } from './OracleCopyOutputButton';
import { OracleOutputTerminal } from './OracleOutputTerminal';

interface OracleHealthTabProps {
  health: OracleMaintenanceModalState['health'];
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const OracleHealthTab: React.FC<OracleHealthTabProps> = ({ health, copiedKey, onCopy }) => (
  <div className="space-y-4">
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
        <Shield className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Diagnóstico e Cura Pós-Import</strong>
        Detecta objetos quebrados em <code className="text-foreground font-mono">dba_objects</code>, remove automaticamente types fantasmas <code className="text-foreground font-mono">SYS_PLSQL_*</code> e recompila packages em paralelo via <code className="text-foreground font-mono">UTL_RECOMP</code>.
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">Filtro de Schema (opcional)</label>
        <input
          type="text"
          value={health.schema}
          onChange={(e) => health.setSchema(e.target.value)}
          placeholder="Ex: LOCAL (vazio = todos)"
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary font-mono uppercase"
        />
      </div>
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">Usuário DBA</label>
        <input
          type="text"
          value={health.user}
          onChange={(e) => health.setUser(e.target.value)}
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
        />
      </div>
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">Senha DBA</label>
        <input
          type="password"
          value={health.pass}
          onChange={(e) => health.setPass(e.target.value)}
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>

    {/* Botões de Ação com Hierarquia Clara */}
    <div className="flex items-center gap-2.5 pt-1">
      <button
        onClick={() => health.run(false)}
        disabled={health.isRunning}
        className="flex items-center space-x-1.5 px-3.5 py-2 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-98 shadow-2xs"
      >
        <Activity className={`w-3.5 h-3.5 ${health.isRunning ? 'animate-spin text-primary' : 'text-primary'}`} />
        <span>Diagnosticar Apenas</span>
      </button>

      <button
        onClick={() => health.run(true)}
        disabled={health.isRunning}
        className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>Diagnosticar e Corrigir (--fix)</span>
      </button>

      {health.output && (
        <OracleCopyOutputButton
          copied={copiedKey === 'oracle-health-out'}
          onCopy={() => onCopy(health.output, 'oracle-health-out')}
        />
      )}
    </div>

    {/* Terminal de Saída Industrial */}
    {health.output && (
      <OracleOutputTerminal
        title="db_health output"
        output={health.output}
        success={health.success}
        successLabel="SUCESSO"
        failLabel="ATENÇÃO"
      />
    )}
  </div>
);
