import React from 'react';
import { Terminal } from 'lucide-react';

interface WtaKarafTabProps {
  containerNames: string;
  isOpeningKarafClient: boolean;
  onOpenKarafClient?: (containerName: string) => Promise<void> | void;
}

export const WtaKarafTab: React.FC<WtaKarafTabProps> = ({
  containerNames,
  isOpeningKarafClient,
  onOpenKarafClient
}) => (
  <div className="space-y-4">
    {/* Botão de Disparo do Console Karaf */}
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-cyan-500" />
            <span>Console Interativo Karaf Client</span>
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Abre terminal interativo executando <code className="text-foreground font-mono">/opt/pcsist/apache-karaf/bin/client</code> dentro do container
          </p>
        </div>

        <button
          onClick={() => onOpenKarafClient?.(containerNames)}
          disabled={isOpeningKarafClient}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{isOpeningKarafClient ? 'Abrindo Console...' : 'Abrir Console Karaf'}</span>
        </button>
      </div>
    </div>

    {/* Tabela de Portas do WTA */}
    <div className="space-y-2">
      <span className="text-xs font-semibold text-foreground px-1 block">
        Mapeamento das Portas Padrão do Apache Karaf
      </span>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
          <span className="text-2xs uppercase font-bold text-muted-foreground">HTTP Web</span>
          <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">8080</div>
          <p className="text-2xs text-muted-foreground">Portal & APIs</p>
        </div>

        <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
          <span className="text-2xs uppercase font-bold text-muted-foreground">SSH Karaf</span>
          <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">8101</div>
          <p className="text-2xs text-muted-foreground">user/pass: karaf</p>
        </div>

        <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
          <span className="text-2xs uppercase font-bold text-muted-foreground">JMX RMI</span>
          <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">1099</div>
          <p className="text-2xs text-muted-foreground">Monitoramento</p>
        </div>

        <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
          <span className="text-2xs uppercase font-bold text-muted-foreground">Artemis JMS</span>
          <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">61616</div>
          <p className="text-2xs text-muted-foreground">Broker de Filas</p>
        </div>
      </div>
    </div>

    {/* Comandos Úteis */}
    <div className="p-3.5 bg-[#090D14] rounded-xl border border-border/60 text-xs font-mono text-emerald-400 space-y-1">
      <div className="text-muted-foreground text-2xs font-sans font-semibold mb-1">
        Comandos frequentes no console Karaf:
      </div>
      <div>bundle:list | grep -i winthor <span className="text-muted-foreground font-sans text-2xs"># Lista bundles WinThor</span></div>
      <div>bundle:diag &lt;id&gt; <span className="text-muted-foreground font-sans text-2xs"># Diagnóstico de falha de resolução</span></div>
      <div>log:tail <span className="text-muted-foreground font-sans text-2xs"># Acompanha logs do Karaf em tempo real</span></div>
    </div>
  </div>
);
