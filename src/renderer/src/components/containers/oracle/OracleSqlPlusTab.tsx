import React from 'react';
import { Terminal } from 'lucide-react';
import type { OracleMaintenanceModalState } from '../../../hooks/containers/useOracleMaintenanceModal';

interface OracleSqlPlusTabProps {
  sql: OracleMaintenanceModalState['sql'];
}

export const OracleSqlPlusTab: React.FC<OracleSqlPlusTabProps> = ({ sql }) => (
  <div className="space-y-4">
    <div className="bg-info/5 border border-info/20 rounded-xl p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info shrink-0 mt-0.5">
        <Terminal className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Terminal Interativo SQL*Plus</strong>
        Abre instantaneamente o Windows Terminal ou CMD executando <code className="text-foreground font-mono">sqlplus_conn.sh</code> com conexão TCP nativa <code className="text-foreground font-mono">//localhost:1521/XE</code>.
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">Usuário de Acesso</label>
        <input
          type="text"
          value={sql.user}
          onChange={(e) => sql.setUser(e.target.value)}
          placeholder="sys ou system"
          className="w-full bg-card border border-input/80 rounded-[10px] px-2.5 py-2.5 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-mono"
        />
        <p className="text-2xs text-muted-foreground mt-1">Conexão como <span className="font-mono text-foreground font-semibold">sys</span> eleva automaticamente para AS SYSDBA.</p>
      </div>
      <div>
        <label className="text-2xs font-semibold text-muted-foreground block mb-1">Senha</label>
        <input
          type="password"
          value={sql.pass}
          onChange={(e) => sql.setPass(e.target.value)}
          className="w-full bg-card border border-input/80 rounded-[10px] px-2.5 py-2.5 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>

    <div className="pt-2">
      <button
        onClick={sql.open}
        disabled={sql.isOpening}
        className="flex items-center space-x-2 px-4 py-2 bg-info hover:bg-info/90 text-background rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
      >
        <Terminal className="w-4 h-4" />
        <span>{sql.isOpening ? 'Abrindo Terminal...' : 'Abrir Sessão SQL*Plus no Terminal'}</span>
      </button>
    </div>
  </div>
);
