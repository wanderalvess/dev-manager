import React from 'react';
import { Globe, ExternalLink, Server } from 'lucide-react';
import type { HttpHealthResult } from '../../../../shared/types';

interface QuickLinksProps {
  webPort: number | string;
  webPortalUrl: string;
  karafConsoleUrl: string;
  hasKarafPath: boolean;
  webHealth: HttpHealthResult | null;
  onOpenLink: (url: string) => void;
}

const LINK_BTN =
  'h-9 px-3 bg-card hover:bg-muted border border-border rounded-[10px] text-[13px] font-medium text-foreground flex items-center gap-2 transition-colors cursor-pointer';

/** Links rápidos do portal web (com saúde HTTP) e do console OSGi. */
export const QuickLinks: React.FC<QuickLinksProps> = ({
  webPort,
  webPortalUrl,
  karafConsoleUrl,
  hasKarafPath,
  webHealth,
  onOpenLink
}) => {
  const isUp = webHealth ? (webHealth.reachable ?? webHealth.isHealthy) : null;
  const status = webHealth?.status ?? webHealth?.statusCode ?? 200;
  const timeMs = webHealth?.timeMs ?? webHealth?.responseTimeMs ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onOpenLink(webPortalUrl)}
        className={`${LINK_BTN} flex-1 min-w-0 justify-between`}
        title={`Abrir Portal Web no navegador (${webPortalUrl}) - ${isUp ? `Ativo: HTTP ${status} (${timeMs}ms)` : 'Serviço HTTP indisponível ou iniciando'}`}
      >
        <span className="flex items-center gap-2 truncate">
          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">Portal web (:{webPort})</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {isUp !== null && (
            <span
              className={`text-[13px] font-medium px-2 py-0.5 rounded-full ${
                isUp ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isUp ? `Ativo · ${status} (${timeMs} ms)` : 'Parado'}
            </span>
          )}
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </span>
      </button>

      {hasKarafPath && (
        <button
          type="button"
          onClick={() => onOpenLink(karafConsoleUrl)}
          className={LINK_BTN}
          title={`Abrir Console Web OSGi / Apache Felix (${karafConsoleUrl})`}
        >
          <Server className="w-4 h-4 text-muted-foreground" />
          <span className="hidden xl:inline">Console OSGi</span>
        </button>
      )}
    </div>
  );
};
