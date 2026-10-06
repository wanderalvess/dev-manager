import React from 'react';
import { Zap } from 'lucide-react';
import { TautAutomationPanel } from '../components/quality/TautAutomationPanel';
import { QualityPageShell } from '../components/quality/page/QualityPageShell';
import { useQualityPageSettings } from '../hooks/quality/page/useQualityPageSettings';

interface QualityTautPageProps {
  onNavigate?: (tab: string) => void;
  settingsVersion?: number;
  isActive?: boolean;
}

export const QualityTautPage: React.FC<QualityTautPageProps> = ({ onNavigate, settingsVersion }) => {
  const { settings } = useQualityPageSettings(settingsVersion);
  return (
    <QualityPageShell
      icon={Zap}
      title="TAUT (Cypress)"
      description="Automação de testes E2E: projeto, execução, cobertura e intake de casos via CSV."
    >
      <div className="flex-1 overflow-y-auto p-6">
        <TautAutomationPanel settings={settings} onNavigateToSettings={() => onNavigate?.('settings')} />
      </div>
    </QualityPageShell>
  );
};
