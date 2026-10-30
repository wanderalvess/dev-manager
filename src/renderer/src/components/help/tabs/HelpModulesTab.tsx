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
import { HttpClientModuleCard } from '../modules/HttpClientModuleCard';
import { IntegrationsModuleCard } from '../modules/IntegrationsModuleCard';
import { IntegrationTraceModuleCard } from '../modules/IntegrationTraceModuleCard';

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
    // Mesma ordem dos grupos do menu lateral (header/headerNavConfig.ts); Integrações e MCP fecham a lista.
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EnvironmentModuleCard debugPort={debugPort} onNavigate={onNavigate} />
      <ContainersModuleCard onNavigate={onNavigate} />
      <RoutinesModuleCard onNavigate={onNavigate} />
      <DeployModuleCard onNavigate={onNavigate} />
      <LogsModuleCard onNavigate={onNavigate} />
      <ApmModuleCard onNavigate={onNavigate} />
      <IntegrationTraceModuleCard onNavigate={onNavigate} />
      <DatabaseModuleCard onNavigate={onNavigate} />
      <GitModuleCard onNavigate={onNavigate} />
      <DocsRagModuleCard onNavigate={onNavigate} />
      <HttpClientModuleCard onNavigate={onNavigate} />
      <QualityModuleCard onNavigate={onNavigate} />
      <IntegrationsModuleCard onNavigate={onNavigate} />
      <McpModuleCard
        handleOpenMcpDocs={handleOpenMcpDocs}
        copyToClipboard={copyToClipboard}
        copiedItem={copiedItem}
      />
    </div>
  );
};
