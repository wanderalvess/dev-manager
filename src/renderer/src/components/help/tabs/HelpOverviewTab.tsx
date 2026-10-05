import React from 'react';
import { SystemAppInfo } from '../../../../../shared/types';
import { HelpCategory } from '../helpData';
import { HelpOverviewHero } from '../overview/HelpOverviewHero';
import { HelpOverviewWorkflow } from '../overview/HelpOverviewWorkflow';
import { HelpOverviewModules } from '../overview/HelpOverviewModules';
import { HelpOverviewServices } from '../overview/HelpOverviewServices';

interface HelpOverviewTabProps {
  appInfo: SystemAppInfo | null;
  webPort: number;
  sshPort: number;
  debugPort: number;
  portalWebUrl: string;
  consoleUrl: string;
  needsSetup: boolean;
  onNavigate?: (tab: string) => void;
  onRestartTour?: () => void;
  onResetPageTours?: () => void;
  setActiveCategory: (cat: HelpCategory) => void;
  handleOpenLink: (url: string) => void;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
}

export const HelpOverviewTab: React.FC<HelpOverviewTabProps> = ({
  appInfo,
  webPort,
  sshPort,
  debugPort,
  portalWebUrl,
  consoleUrl,
  needsSetup,
  onNavigate,
  onRestartTour,
  onResetPageTours,
  setActiveCategory,
  handleOpenLink,
  copyToClipboard,
  copiedItem
}) => {
  return (
    <div className="space-y-4">
      <HelpOverviewHero
        appInfo={appInfo}
        webPort={webPort}
        sshPort={sshPort}
        debugPort={debugPort}
        needsSetup={needsSetup}
        onNavigate={onNavigate}
        onRestartTour={onRestartTour}
        onResetPageTours={onResetPageTours}
        setActiveCategory={setActiveCategory}
      />
      <HelpOverviewWorkflow debugPort={debugPort} onNavigate={onNavigate} />
      <HelpOverviewModules onNavigate={onNavigate} />
      <HelpOverviewServices
        webPort={webPort}
        portalWebUrl={portalWebUrl}
        consoleUrl={consoleUrl}
        handleOpenLink={handleOpenLink}
        copyToClipboard={copyToClipboard}
        copiedItem={copiedItem}
      />
    </div>
  );
};
