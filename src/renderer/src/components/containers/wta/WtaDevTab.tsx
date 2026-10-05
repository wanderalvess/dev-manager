import React from 'react';
import { HardDrive } from 'lucide-react';
import { WTA_ENV_SAMPLE } from '../../../utils/wtaUtilsModalUtils';

interface WtaDevTabProps {
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const WtaDevTab: React.FC<WtaDevTabProps> = ({ copiedKey, onCopy }) => (
  <div className="space-y-4">
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
        <HardDrive className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">
          Modo Desenvolvedor: Montagem do Cache ~/.m2
        </strong>
        O container WTA monta o diretório de dependências Maven do host (<code className="text-foreground font-mono">~/.m2/repository</code>) diretamente em <code className="text-foreground font-mono">/root/.m2/repository</code>. Assim, qualquer JAR gerado via <code className="text-foreground font-mono">mvn install</code> no host fica imediatamente acessível pelo Karaf.
      </div>
    </div>

    <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Variáveis do arquivo wta.env (Modelo Oficial)</span>
        <button
          onClick={() => onCopy(WTA_ENV_SAMPLE, 'wta-env-sample')}
          className="text-2xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer"
        >
          {copiedKey === 'wta-env-sample' ? 'Copiado!' : 'Copiar Modelo wta.env'}
        </button>
      </div>

      <pre className="bg-[#090D14] p-3 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all border border-border/60">
DB_HOST=172.17.0.1
DB_PORT=1521
DB_SERVICE=XE
DB_USER=LOCAL
DB_PASSWORD=pcinfo
      </pre>
    </div>
  </div>
);
