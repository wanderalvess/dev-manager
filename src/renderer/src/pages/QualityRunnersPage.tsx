import React from 'react';
import { PlayCircle } from 'lucide-react';
import { AutomatedTestRunners } from '../components/quality/AutomatedTestRunners';
import { QualityPageShell } from '../components/quality/page/QualityPageShell';
import { useQualityPageSettings } from '../hooks/quality/page/useQualityPageSettings';
import { useQualityValidation } from '../hooks/quality/page/useQualityValidation';

interface QualityRunnersPageProps {
  onNavigate?: (tab: string) => void;
  settingsVersion?: number;
  isActive?: boolean;
}

export const QualityRunnersPage: React.FC<QualityRunnersPageProps> = ({ onNavigate, settingsVersion }) => {
  const { settings } = useQualityPageSettings(settingsVersion);
  const validation = useQualityValidation();
  return (
    <QualityPageShell
      icon={PlayCircle}
      title="Test Runners"
      description="Execute suítes automatizadas e sincronize o resultado com os cenários da Matriz de Homologação."
    >
      <AutomatedTestRunners
        settings={settings}
        validationItems={validation.items}
        onSyncWithValidationMatrix={validation.handleSyncWithValidationMatrix}
        onNavigate={onNavigate}
      />
    </QualityPageShell>
  );
};
