import React from 'react';
import { History, Layers, RotateCcw } from 'lucide-react';
import type { ChangelogVersion } from '../../utils/changelogUtils';

interface WhatsNewFooterButtonsProps {
  parsedVersions: ChangelogVersion[];
  isAllVersions: boolean;
  isLatestVersion: boolean;
  latestVersion?: string;
  onSelectVersion: (version: string) => void;
}

/** Botões contextuais no rodapé à esquerda de "Concluir Leitura". */
export const WhatsNewFooterButtons: React.FC<WhatsNewFooterButtonsProps> = ({
  parsedVersions,
  isAllVersions,
  isLatestVersion,
  latestVersion,
  onSelectVersion
}) => (
  <div className="flex items-center gap-2">
    {isLatestVersion && parsedVersions.length > 1 && (
      <button
        type="button"
        onClick={() => {
          // Se estiver na mais recente, vai para a versão anterior ou abre histórico
          if (parsedVersions[1]) {
            onSelectVersion(parsedVersions[1].version);
          } else {
            onSelectVersion('all');
          }
        }}
        className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
        title="Ver o que mudou nas versões anteriores"
      >
        <History className="w-3.5 h-3.5 text-primary" />
        <span>Ver Versões Anteriores</span>
      </button>
    )}

    {!isLatestVersion && !isAllVersions && latestVersion && (
      <>
        <button
          type="button"
          onClick={() => onSelectVersion(latestVersion)}
          className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
          title="Retornar para a versão mais recente"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
          <span>Voltar para v{latestVersion}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectVersion('all')}
          className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs"
          title="Rolar por todo o changelog"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Histórico Completo</span>
        </button>
      </>
    )}
  </div>
);
