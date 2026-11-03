import React from 'react';
import { SystemAppInfo } from '../../../../../shared/types';
import type { HelpCategory } from '../helpSections';
import type { FaqItem } from '../helpData';
import { HelpOverviewHero } from '../overview/HelpOverviewHero';
import { HelpOverviewWorkflow } from '../overview/HelpOverviewWorkflow';
import { HelpOverviewRoles } from '../overview/HelpOverviewRoles';
import { HelpOverviewCommonProblems } from '../overview/HelpOverviewCommonProblems';
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
  faqList: FaqItem[];
  onNavigate?: (tab: string) => void;
  onOpenFaq: (id: string) => void;
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
  faqList,
  onNavigate,
  onOpenFaq,
  setActiveCategory,
  handleOpenLink,
  copyToClipboard,
  copiedItem
}) => (
  <div className="space-y-4">
    <HelpOverviewHero
      appInfo={appInfo}
      webPort={webPort}
      sshPort={sshPort}
      debugPort={debugPort}
      needsSetup={needsSetup}
      onNavigate={onNavigate}
      setActiveCategory={setActiveCategory}
    />
    <HelpOverviewWorkflow debugPort={debugPort} onNavigate={onNavigate} />
    <HelpOverviewRoles onNavigate={onNavigate} />
    <HelpOverviewCommonProblems
      faqList={faqList}
      onOpenFaq={onOpenFaq}
      onSeeAll={() => setActiveCategory('faq')}
    />
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
