import React from 'react';
import { Compass, ExternalLink, Copy, Check } from 'lucide-react';
import { HelpOverviewSectionHeader } from './HelpOverviewSectionHeader';

interface HelpOverviewServicesProps {
  webPort: number;
  portalWebUrl: string;
  consoleUrl: string;
  handleOpenLink: (url: string) => void;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
}

interface ServiceCardProps {
  title: string;
  badge: string;
  badgeClass: string;
  hoverBorderClass: string;
  openClass: string;
  openLabel: string;
  displayText: string;
  displayTitle?: string;
  onOpen: () => void;
  // Quando presente, exibe o botão de copiar URL ao lado do botão de abrir.
  copy?: { text: string; copyKey: string; copiedItem: string | null; onCopy: (text: string, key?: string) => void };
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  badge,
  badgeClass,
  hoverBorderClass,
  openClass,
  openLabel,
  displayText,
  displayTitle,
  onOpen,
  copy
}) => (
  <div className={`p-4 rounded-xl bg-card/60 border border-border ${hoverBorderClass} transition-all space-y-3 flex flex-col justify-between shadow-2xs`}>
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground block">
          {title}
        </span>
        <span className={`text-2xs font-mono px-1.5 py-0.5 rounded ${badgeClass} font-bold`}>
          {badge}
        </span>
      </div>
      <p className="text-2xs font-mono text-muted-foreground truncate" title={displayTitle}>
        {displayText}
      </p>
    </div>

    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={onOpen}
        className={`${copy ? 'flex-1' : 'w-full'} py-1.5 px-2 ${openClass} rounded-lg text-2xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer`}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>{openLabel}</span>
      </button>
      {copy && (
        <button
          onClick={() => copy.onCopy(copy.text, copy.copyKey)}
          className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition cursor-pointer"
          title="Copiar URL" aria-label="Copiar URL"
        >
          {copy.copiedItem === copy.copyKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  </div>
);

export const HelpOverviewServices: React.FC<HelpOverviewServicesProps> = ({
  webPort,
  portalWebUrl,
  consoleUrl,
  handleOpenLink,
  copyToClipboard,
  copiedItem
}) => (
  <div className="cockpit-panel rounded-xl p-5 border border-border shadow-xl space-y-3.5">
    <HelpOverviewSectionHeader
      icon={Compass}
      title="Serviços Locais & Portais Externos"
      subtitle="Acesso rápido em 1 clique aos endpoints do ecossistema"
    />

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <ServiceCard
        title="Portal Web Local"
        badge={`:${webPort}`}
        badgeClass="bg-primary/10 text-primary"
        hoverBorderClass="hover:border-primary/50"
        openClass="bg-primary/10 hover:bg-primary/20 text-primary"
        openLabel="Abrir"
        displayText={portalWebUrl.replace('http://', '')}
        displayTitle={portalWebUrl}
        onOpen={() => handleOpenLink(portalWebUrl)}
        copy={{ text: portalWebUrl, copyKey: 'link-web', copiedItem, onCopy: copyToClipboard }}
      />
      <ServiceCard
        title="Console Felix / OSGi"
        badge="Bundles"
        badgeClass="bg-amber-500/10 text-amber-500"
        hoverBorderClass="hover:border-amber-500/50"
        openClass="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500"
        openLabel="Abrir"
        displayText={consoleUrl.replace('http://', '')}
        displayTitle={consoleUrl}
        onOpen={() => handleOpenLink(consoleUrl)}
        copy={{ text: consoleUrl, copyKey: 'link-console', copiedItem, onCopy: copyToClipboard }}
      />
      <ServiceCard
        title="Apache Karaf Docs"
        badge="Manual"
        badgeClass="bg-blue-500/10 text-blue-500"
        hoverBorderClass="hover:border-blue-500/50"
        openClass="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
        openLabel="Acessar Manual"
        displayText="karaf.apache.org/documentation"
        onOpen={() => handleOpenLink('https://karaf.apache.org/documentation.html')}
      />
      <ServiceCard
        title="Azure DevOps"
        badge="PRs & Repos"
        badgeClass="bg-indigo-500/10 text-indigo-400"
        hoverBorderClass="hover:border-indigo-500/50"
        openClass="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400"
        openLabel="Abrir Portal"
        displayText="dev.azure.com"
        onOpen={() => handleOpenLink('https://dev.azure.com')}
      />
    </div>
  </div>
);
