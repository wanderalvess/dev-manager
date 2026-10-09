import React from 'react';
import { Database, Globe, Key, Box, ExternalLink } from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import { parsePortLinks } from '../../../utils/dockerContainerUtils';
import type { ContainerCardKinds } from '../../../utils/containerCardKind';

interface ContainerCardTitleRowProps extends ContainerCardKinds {
  container: DockerContainerInfo;
  cleanName: string;
  isSelected?: boolean;
  onToggleSelect?: (containerId: string) => void;
  getStateBadge: (state: string) => React.ReactNode;
}

const RuntimeTag: React.FC<ContainerCardKinds> = ({ isOracle, isWta, isWsh }) => {
  if (isOracle) {
    return (
      <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-2xs font-mono font-bold flex items-center gap-1.5">
        <Database className="w-3 h-3 text-orange-500" />
        ORACLE XE
      </span>
    );
  }
  if (isWta) {
    return (
      <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-2xs font-mono font-bold flex items-center gap-1.5">
        <Globe className="w-3 h-3 text-cyan-500" />
        WTA KARAF
      </span>
    );
  }
  if (isWsh) {
    return (
      <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 text-2xs font-mono font-bold flex items-center gap-1.5">
        <Key className="w-3 h-3 text-violet-500" />
        WSH HUB
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/30 text-2xs font-mono font-bold flex items-center gap-1.5">
      <Box className="w-3 h-3 text-muted-foreground" />
      DOCKER
    </span>
  );
};

/** Linha 1: checkbox de seleção, tag de runtime, nome, id, estado e portas mapeadas. */
export const ContainerCardTitleRow: React.FC<ContainerCardTitleRowProps> = ({
  container,
  cleanName,
  isOracle,
  isWta,
  isWsh,
  isSelected,
  onToggleSelect,
  getStateBadge
}) => {
  const portLinks = parsePortLinks(container.ports);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={() => onToggleSelect(container.id)}
            title={isSelected ? 'Desmarcar container' : 'Selecionar container para ações em lote'}
            className="w-4 h-4 rounded text-primary border-border/80 focus:ring-primary focus:ring-1 cursor-pointer mr-0.5 accent-primary shrink-0"
          />
        )}

        <RuntimeTag isOracle={isOracle} isWta={isWta} isWsh={isWsh} />

        <span className="font-bold text-foreground text-sm tracking-tight font-sans">{cleanName}</span>

        <span className="text-2xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 select-all">
          {container.id.slice(0, 12)}
        </span>

        {getStateBadge(container.state)}
      </div>

      {/* Portas Mapeadas com Pills Interativas */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {portLinks.length > 0 ? (
          portLinks.map((p, idx) => (
            <a
              key={idx}
              href={`http://localhost:${p.hostPort}`}
              target="_blank"
              rel="noreferrer"
              title={`Abrir http://localhost:${p.hostPort} (${p.containerPort}/${p.protocol})`}
              className="inline-flex items-center gap-1 text-2xs font-mono px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition cursor-pointer"
            >
              <span>{p.hostPort}→{p.containerPort}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          ))
        ) : container.ports ? (
          <span className="text-2xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
            {container.ports}
          </span>
        ) : null}
      </div>
    </div>
  );
};
