import React from 'react';
import { ObservabilityOverview } from '../../../shared/types';
import { useApmDashboard } from '../hooks/apm/useApmDashboard';
import { ApmDashboardStandby } from './apm/dashboard/ApmDashboardStandby';
import { ApmDashboardMetricCards } from './apm/dashboard/ApmDashboardMetricCards';
import { ApmDashboardTimeChart } from './apm/dashboard/ApmDashboardTimeChart';
import { ApmDashboardEndpointsPanel } from './apm/dashboard/ApmDashboardEndpointsPanel';
import { ApmDashboardSlowQueriesPanel } from './apm/dashboard/ApmDashboardSlowQueriesPanel';

interface ApmDashboardViewProps {
  overview: ObservabilityOverview | null;
  onFilterByEndpoint?: (route: string) => void;
  onFilterBySlowQuery?: (statement: string) => void;
  onSelectTrace?: (traceId: string) => void;
  onNavigateToDatabase?: () => void;
  onGenerateDemo?: () => void;
  /** Abre "Como Conectar", onde a porta do receptor pode ser trocada */
  onOpenSetup?: () => void;
}

export const ApmDashboardView: React.FC<ApmDashboardViewProps> = ({
  overview,
  onFilterByEndpoint,
  onFilterBySlowQuery,
  onSelectTrace,
  onNavigateToDatabase,
  onGenerateDemo,
  onOpenSetup
}) => {
  const dashboard = useApmDashboard({ overview, onNavigateToDatabase });

  if (!overview || overview.totalTraces === 0) {
    return (
      <ApmDashboardStandby
        overview={overview}
        copyToClipboard={dashboard.copyToClipboard}
        copyFeedback={dashboard.copyFeedback}
        onGenerateDemo={onGenerateDemo}
        onOpenSetup={onOpenSetup}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4 no-scrollbar select-text bg-background">
      <ApmDashboardMetricCards
        overview={overview}
        timeSeries={dashboard.timeSeries}
        maxBucketRequests={dashboard.maxBucketRequests}
        rpm={dashboard.rpm}
      />

      <ApmDashboardTimeChart
        timeSeries={dashboard.timeSeries}
        maxBucketRequests={dashboard.maxBucketRequests}
        latencyLinePoints={dashboard.latencyLinePoints}
        hoveredBucketIdx={dashboard.hoveredBucketIdx}
        onHoverBucket={dashboard.setHoveredBucketIdx}
      />

      {/* Seção Dividida: Top Endpoints & Slow Queries do Banco */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <ApmDashboardEndpointsPanel
          endpoints={dashboard.displayedEndpoints}
          sortMode={dashboard.endpointSortMode}
          onSortModeChange={dashboard.setEndpointSortMode}
          onFilterByEndpoint={onFilterByEndpoint}
        />
        <ApmDashboardSlowQueriesPanel
          slowQueries={dashboard.slowQueries}
          onFilterByEndpoint={onFilterByEndpoint}
          onFilterBySlowQuery={onFilterBySlowQuery}
          onSelectTrace={onSelectTrace}
          onOpenInDbStudio={dashboard.handleOpenInDbStudio}
        />
      </div>
    </div>
  );
};
