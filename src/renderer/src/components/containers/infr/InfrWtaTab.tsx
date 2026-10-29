import React from 'react';
import { Globe, Play, RotateCw } from 'lucide-react';
import {
  INFR_DEFAULT_WTA_CONTAINER,
  INFR_DEFAULT_WTA_PORT,
  infrBootstrapModalParsePort
} from '../../../utils/infrBootstrapModalUtils';
import { buildWtaSetupCommand, isValidWinthorVersion, winthorVersionPorts } from '../../../../../shared/infrWinthorVersion';

interface InfrWtaTabProps {
  container: string;
  port: number;
  version: string;
  isExecuting: boolean;
  onContainerChange: (value: string) => void;
  onPortChange: (value: number) => void;
  onRun: () => void;
}

const INPUT_CLASS =
  'w-full bg-background border border-input/80 rounded-[10px] px-2.5 py-2.5 text-sm text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-info';

export const InfrWtaTab: React.FC<InfrWtaTabProps> = ({
  container,
  port,
  version,
  isExecuting,
  onContainerChange,
  onPortChange,
  onRun
}) => {
  const versioned = isValidWinthorVersion(version);
  const ports = versioned ? winthorVersionPorts(version) : null;
  const command = buildWtaSetupCommand({
    container: container || INFR_DEFAULT_WTA_CONTAINER,
    port: port || INFR_DEFAULT_WTA_PORT,
    version
  });

  return (
    <div className="space-y-4">
      <div className="bg-info/5 border border-info/20 rounded-xl p-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info shrink-0 mt-0.5">
          <Globe className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground font-semibold block mb-0.5">
            Setup Automatizado do WinThor Anywhere (WTA)
          </strong>
          Executa <code className="text-foreground font-mono">wta_setup.sh</code> na pasta <code className="text-foreground font-mono">linux-winthor/scripts</code>. Cria o container do WTA, mapeia a porta HTTP (8080) e as portas do Karaf (8101, 1099, 61616).
          Com a <strong className="text-foreground">versão do WinThor</strong>, sobe a imagem daquela versão, com as features de{' '}
          <code className="text-foreground font-mono">versions/&lt;versão&gt;.features</code> já instaladas. Se a imagem ainda não existe, ela é gerada antes pelo Nexus, o que leva alguns minutos.
        </div>
      </div>

      <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-2xs font-semibold text-muted-foreground block mb-1">Nome do Container WTA</label>
            <input
              type="text"
              value={container}
              onChange={(e) => onContainerChange(e.target.value)}
              placeholder="linux-winthor"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="text-2xs font-semibold text-muted-foreground block mb-1">Porta Web Externa</label>
            <input
              type="number"
              value={port}
              onChange={(e) => onPortChange(infrBootstrapModalParsePort(e.target.value, INFR_DEFAULT_WTA_PORT))}
              placeholder="8080"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {ports && (
          <p className="text-2xs text-muted-foreground">
            Portas do Karaf nesta versão: SSH {ports.ssh}, JMX {ports.jmx}, Artemis {ports.jms}, para rodar ao lado de outras versões.
            O ambiente vem do <code className="font-mono">wta.env.{version}</code>, com <code className="font-mono">DB_HOST=oracle-{version}</code>, o banco desta versão.
          </p>
        )}

        <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400 break-all">
          {command}
        </div>

        <button
          onClick={onRun}
          disabled={isExecuting}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-info hover:bg-info text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {isExecuting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>
            {isExecuting ? 'Iniciando Setup...' : versioned ? `Executar Setup WTA ${version}` : 'Executar Setup WTA'}
          </span>
        </button>
      </div>
    </div>
  );
};
