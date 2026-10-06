import React, { Suspense, lazy } from 'react';
import { RefreshCw } from 'lucide-react';
import { ServiceStatus, GitProjectInfo } from '../../../../shared/types';
import { QualityValidationProvider } from '../../hooks/quality/page/QualityValidationContext';

// Code-split cada página: cada aba só baixa/parseia seu próprio bundle na primeira
// vez que é visitada (visitedTabs em conjunto com isso evita tanto o parse quanto o
// download antecipado de todas as ~10 páginas no startup do app).
const EnvironmentPage = lazy(() => import('../../pages/EnvironmentPage').then((m) => ({ default: m.EnvironmentPage })));
const DatabasePage = lazy(() => import('../../pages/DatabasePage').then((m) => ({ default: m.DatabasePage })));
const ContainersPage = lazy(() => import('../../pages/ContainersPage').then((m) => ({ default: m.ContainersPage })));
const DeployPage = lazy(() => import('../../pages/DeployPage').then((m) => ({ default: m.DeployPage })));
const GitAzurePage = lazy(() => import('../../pages/GitAzurePage').then((m) => ({ default: m.GitAzurePage })));
const RoutinesPage = lazy(() => import('../../pages/RoutinesPage').then((m) => ({ default: m.RoutinesPage })));
const DocsPage = lazy(() => import('../../pages/DocsPage').then((m) => ({ default: m.DocsPage })));
const SettingsPage = lazy(() => import('../../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('../../pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const LogsPage = lazy(() => import('../../pages/LogsPage').then((m) => ({ default: m.LogsPage })));
const ApmPage = lazy(() => import('../../pages/ApmPage').then((m) => ({ default: m.ApmPage })));
const QualityPage = lazy(() => import('../../pages/QualityPage').then((m) => ({ default: m.QualityPage })));
const QualityRegressionPage = lazy(() =>
  import('../../pages/QualityRegressionPage').then((m) => ({ default: m.QualityRegressionPage }))
);
const QualityRunnersPage = lazy(() => import('../../pages/QualityRunnersPage').then((m) => ({ default: m.QualityRunnersPage })));
const QualityTautPage = lazy(() => import('../../pages/QualityTautPage').then((m) => ({ default: m.QualityTautPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="h-full w-full flex items-center justify-center">
    <RefreshCw className="w-6 h-6 text-primary animate-spin" />
  </div>
);

interface PageSlotProps {
  id: string;
  activeTab: string;
  visitedTabs: Set<string>;
  children: React.ReactNode;
}

// Páginas visitadas ficam montadas (só escondidas) para preservar estado entre abas.
const PageSlot: React.FC<PageSlotProps> = ({ id, activeTab, visitedTabs, children }) => {
  if (!visitedTabs.has(id)) return null;
  return <div className={`h-full w-full ${activeTab === id ? '' : 'hidden'}`}>{children}</div>;
};

export interface AppPageHostProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  visitedTabs: Set<string>;
  settingsVersion: number;
  services: ServiceStatus[];
  projects: GitProjectInfo[];
  isRefreshing: boolean;
  helpSearch: string;
  fetchServices: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  navigateToHelp: (search?: string) => void;
  onSettingsSaved: () => void;
  onRestartTour: () => void;
  onResetPageTours: () => void;
}

export const AppPageHost: React.FC<AppPageHostProps> = ({
  activeTab,
  setActiveTab,
  visitedTabs,
  settingsVersion,
  services,
  projects,
  isRefreshing,
  helpSearch,
  fetchServices,
  fetchProjects,
  navigateToHelp,
  onSettingsSaved,
  onRestartTour,
  onResetPageTours
}) => {
  const goSettings = () => setActiveTab('settings');
  const slot = { activeTab, visitedTabs };

  return (
    <main className="flex-1 overflow-hidden bg-background relative">
      <Suspense fallback={<PageLoadingFallback />}>
        <PageSlot id="env" {...slot}>
          <EnvironmentPage
            services={services}
            onRefreshServices={fetchServices}
            onNavigateToSettings={goSettings}
            onNavigateToHelp={navigateToHelp}
            isActive={activeTab === 'env'}
            settingsVersion={settingsVersion}
          />
        </PageSlot>
        <PageSlot id="database" {...slot}>
          <DatabasePage settingsVersion={settingsVersion} onNavigateToSettings={goSettings} />
        </PageSlot>
        <PageSlot id="containers" {...slot}>
          <ContainersPage isActive={activeTab === 'containers'} settingsVersion={settingsVersion} />
        </PageSlot>
        <PageSlot id="deploy" {...slot}>
          <DeployPage projects={projects} onNavigateToSettings={goSettings} settingsVersion={settingsVersion} />
        </PageSlot>
        <PageSlot id="git" {...slot}>
          <GitAzurePage
            projects={projects}
            onRefreshProjects={fetchProjects}
            isRefreshing={isRefreshing}
            onNavigateToSettings={goSettings}
            settingsVersion={settingsVersion}
          />
        </PageSlot>
        <PageSlot id="routines" {...slot}>
          <RoutinesPage
            onNavigateToSettings={goSettings}
            onNavigateToEnv={() => setActiveTab('env')}
            settingsVersion={settingsVersion}
          />
        </PageSlot>
        <PageSlot id="docs" {...slot}>
          <DocsPage onNavigateToSettings={goSettings} settingsVersion={settingsVersion} />
        </PageSlot>
        <PageSlot id="logs" {...slot}>
          <LogsPage
            onNavigateToSettings={goSettings}
            isActive={activeTab === 'logs'}
            settingsVersion={settingsVersion}
          />
        </PageSlot>
        <PageSlot id="apm" {...slot}>
          <ApmPage
            isActive={activeTab === 'apm'}
            onNavigateToSettings={goSettings}
            onNavigateToDatabase={() => setActiveTab('database')}
          />
        </PageSlot>
        <QualityValidationProvider>
          <PageSlot id="quality" {...slot}>
            <QualityPage
              isActive={activeTab === 'quality'}
              onNavigate={(tab) => setActiveTab(tab)}
              settingsVersion={settingsVersion}
            />
          </PageSlot>
          <PageSlot id="quality-regression" {...slot}>
            <QualityRegressionPage
              isActive={activeTab === 'quality-regression'}
              onNavigate={(tab) => setActiveTab(tab)}
              settingsVersion={settingsVersion}
            />
          </PageSlot>
          <PageSlot id="quality-runners" {...slot}>
            <QualityRunnersPage
              isActive={activeTab === 'quality-runners'}
              onNavigate={(tab) => setActiveTab(tab)}
              settingsVersion={settingsVersion}
            />
          </PageSlot>
          <PageSlot id="quality-taut" {...slot}>
            <QualityTautPage
              isActive={activeTab === 'quality-taut'}
              onNavigate={(tab) => setActiveTab(tab)}
              settingsVersion={settingsVersion}
            />
          </PageSlot>
        </QualityValidationProvider>
        <PageSlot id="settings" {...slot}>
          <SettingsPage onSettingsSaved={onSettingsSaved} onNavigate={(tab) => setActiveTab(tab)} />
        </PageSlot>
        <PageSlot id="help" {...slot}>
          <HelpPage
            onNavigate={(tab) => setActiveTab(tab)}
            initialSearch={helpSearch}
            settingsVersion={settingsVersion}
            onRestartTour={onRestartTour}
            onResetPageTours={onResetPageTours}
          />
        </PageSlot>
      </Suspense>
    </main>
  );
};
