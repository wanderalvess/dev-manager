import React from 'react';
import {
  EnvironmentModuleCard,
  ContainersModuleCard,
  DocsRagModuleCard,
  LogsModuleCard
} from '../modules/InfraModuleCards';
import { DatabaseModuleCard } from '../modules/DatabaseModuleCard';
import { DeployModuleCard } from '../modules/DeployModuleCard';
import { GitModuleCard } from '../modules/GitModuleCard';
import { RoutinesModuleCard } from '../modules/RoutinesModuleCard';
import { ApmModuleCard } from '../modules/ApmModuleCard';
import { McpModuleCard } from '../modules/McpModuleCard';
import { QualityModuleCard } from '../modules/QualityModuleCard';

interface HelpModulesTabProps {
  debugPort: number;
  onNavigate?: (tab: string) => void;
  handleOpenMcpDocs: () => void;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
}

export const HelpModulesTab: React.FC<HelpModulesTabProps> = ({
  debugPort,
  onNavigate,
  handleOpenMcpDocs,
  copyToClipboard,
  copiedItem
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EnvironmentModuleCard debugPort={debugPort} onNavigate={onNavigate} />
      <DatabaseModuleCard onNavigate={onNavigate} />
      <ContainersModuleCard onNavigate={onNavigate} />
      <DeployModuleCard onNavigate={onNavigate} />
      <GitModuleCard onNavigate={onNavigate} />
      <RoutinesModuleCard onNavigate={onNavigate} />
      <DocsRagModuleCard onNavigate={onNavigate} />
      <ApmModuleCard onNavigate={onNavigate} />
      <McpModuleCard
        handleOpenMcpDocs={handleOpenMcpDocs}
        copyToClipboard={copyToClipboard}
        copiedItem={copiedItem}
      />
      <LogsModuleCard onNavigate={onNavigate} />
      <QualityModuleCard onNavigate={onNavigate} />
    </div>
  );
};
