import React from 'react';
import { HardDrive } from 'lucide-react';
import { WTA_ENV_SAMPLE } from '../../../utils/wtaUtilsModalUtils';

interface WtaDevTabProps {
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const WtaDevTab: React.FC<WtaDevTabProps> = ({ copiedKey, onCopy }) => (
  <div className="space-y-4">
    <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center text-success shrink-0 mt-0.5">
        <HardDrive className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">
          Como o Karaf do container acha os pacotes
        </strong>
        O <code className="text-foreground font-mono">wta_setup.sh</code> do INFR-Docker não monta o <code className="text-foreground font-mono">~/.m2</code> do host: o container guarda tudo no volume <code className="text-foreground font-mono">/opt/pcsist</code> e instala as features pelo Nexus configurado em <code className="text-foreground font-mono">org.ops4j.pax.url.mvn.cfg</code>. Um JAR gerado com <code className="text-foreground font-mono">mvn install</code> no host não aparece sozinho no Karaf do container.
      </div>
    </div>

    <div className="p-3 bg-card border border-border/80 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Variáveis do arquivo wta.env (modelo; <code className="font-mono">DB_HOST</code> é o nome do container do banco, ex.: oracle-39)</span>
        <button
          onClick={() => onCopy(WTA_ENV_SAMPLE, 'wta-env-sample')}
          className="text-2xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border/80 font-medium transition cursor-pointer"
        >
          {copiedKey === 'wta-env-sample' ? 'Copiado!' : 'Copiar Modelo wta.env'}
        </button>
      </div>

      <pre className="bg-[#090D14] p-3 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all border border-border/60">
DB_HOST=oracle-39
DB_PORT=1521
DB_SERVICE=XE
DB_USER=LOCAL
DB_PASSWORD=pcinfo
      </pre>
    </div>
  </div>
);
