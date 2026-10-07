import React from 'react';
import { Copy, Network, Terminal } from 'lucide-react';
import { extractOraclePort, getOracleTnsConfig } from '../../../utils/dockerContainerUtils';

interface OracleTnsTabProps {
  ports: string | undefined;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const OracleTnsTab: React.FC<OracleTnsTabProps> = ({ ports, copiedKey, onCopy }) => (
  <div className="space-y-4">
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
        <Network className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Atalho de Conexão TNS (Oracle Database 11g XE)</strong>
        Adicione este bloco ao seu arquivo <code className="text-foreground font-mono">tnsnames.ora</code> para conectar ferramentas de desenvolvimento (PL/SQL Developer, DBeaver, DFe, WTA, Rotinas WinThor) ao banco local via TCP nativo.
      </div>
    </div>

    <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>Bloco de Configuração (tnsnames.ora)</span>
        </span>
        <button
          onClick={() => {
            const port = extractOraclePort(ports);
            onCopy(getOracleTnsConfig(port), 'oracle-tns-modal');
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{copiedKey === 'oracle-tns-modal' ? 'Copiado!' : 'Copiar Bloco TNS'}</span>
        </button>
      </div>

      <pre className="bg-[#090D14] p-3.5 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all border border-border/60">
{getOracleTnsConfig(extractOraclePort(ports))}
      </pre>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-muted-foreground">
        <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
          <span className="font-semibold text-foreground block mb-0.5">Localização típica no Windows:</span>
          <code className="font-mono text-2xs break-all text-foreground/80">C:\oracle\product\...\network\admin\tnsnames.ora</code>
        </div>
        <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
          <span className="font-semibold text-foreground block mb-0.5">Credenciais Padrão (INFR-Docker):</span>
          <div className="font-mono text-2xs text-foreground/80">DBA: <span className="text-foreground font-bold">system</span> / Senha: <span className="text-foreground font-bold">pcinfo</span></div>
          <div className="font-mono text-2xs text-foreground/80">SYSDBA: <span className="text-foreground font-bold">sys</span> / Senha: <span className="text-foreground font-bold">pcinfo</span></div>
        </div>
      </div>
    </div>
  </div>
);
