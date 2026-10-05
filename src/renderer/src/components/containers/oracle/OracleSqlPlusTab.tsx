import React from 'react';
import { Terminal } from 'lucide-react';
import type { OracleMaintenanceModalState } from '../../../hooks/containers/useOracleMaintenanceModal';

interface OracleSqlPlusTabProps {
  sql: OracleMaintenanceModalState['sql'];
}

export const OracleSqlPlusTab: React.FC<OracleSqlPlusTabProps> = ({ sql }) => (
  <div className="space-y-4">
    <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
        <Terminal className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Terminal Interativo SQL*Plus</strong>
        Abre instantaneamente o Windows Terminal ou CMD executando <code className="text-foreground font-mono">sqlplus_conn.sh</code> com conexão TCP nativa <code className="text-foreground font-mono">//localhost:1521/XE</code>.
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário de Acesso</label>
        <input
          type="text"
          value={sql.user}
          onChange={(e) => sql.setUser(e.target.value)}
          placeholder="sys ou system"
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Conexão como <span className="font-mono text-foreground font-semibold">sys</span> eleva automaticamente para AS SYSDBA.</p>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha</label>
        <input
          type="password"
          value={sql.pass}
          onChange={(e) => sql.setPass(e.target.value)}
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>

    <div className="pt-2">
      <button
        onClick={sql.open}
        disabled={sql.isOpening}
        className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
      >
        <Terminal className="w-4 h-4" />
        <span>{sql.isOpening ? 'Abrindo Terminal...' : 'Abrir Sessão SQL*Plus no Terminal'}</span>
      </button>
    </div>
  </div>
);
