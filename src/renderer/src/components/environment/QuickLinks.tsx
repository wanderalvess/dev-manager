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

/** Links rápidos do portal web (com saúde HTTP) e do console OSGi. */
export const QuickLinks: React.FC<QuickLinksProps> = ({
  webPort,
  webPortalUrl,
  karafConsoleUrl,
  hasKarafPath,
  webHealth,
  onOpenLink
}) => (
  <div className="md:col-span-4 flex items-center space-x-2">
    <button
      onClick={() => onOpenLink(webPortalUrl)}
      className="flex-1 py-2 px-3 bg-card hover:bg-muted/60 border border-border hover:border-primary/50 rounded-xl text-xs font-semibold text-foreground flex items-center justify-between gap-1.5 transition-all shadow-xs group"
      title={`Abrir Portal Web no navegador (${webPortalUrl}) - ${(webHealth?.reachable ?? webHealth?.isHealthy) ? `Ativo: HTTP ${webHealth?.status ?? webHealth?.statusCode ?? 200} (${webHealth?.timeMs ?? webHealth?.responseTimeMs ?? 0}ms)` : 'Serviço HTTP indisponível ou iniciando'}`}
    >
      <div className="flex items-center gap-1.5 truncate">
        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="truncate">Portal Web (:{webPort})</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {webHealth && (
          (webHealth.reachable ?? webHealth.isHealthy) ? (
            <span className="flex items-center gap-1 text-2xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {webHealth.status ?? webHealth.statusCode ?? 200} ({webHealth.timeMs ?? webHealth.responseTimeMs ?? 0}ms)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-2xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Off
            </span>
          )
        )}
        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </button>

    {hasKarafPath && (
      <button
        onClick={() => onOpenLink(karafConsoleUrl)}
        className="py-2 px-3 bg-card hover:bg-muted/60 border border-border hover:border-primary/50 rounded-xl text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-all shadow-xs"
        title={`Abrir Console Web OSGi / Apache Felix (${karafConsoleUrl})`}
      >
        <Server className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden lg:inline">Console OSGi</span>
      </button>
    )}
  </div>
);
