import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { QaRegressionRunner } from '../components/quality/QaRegressionRunner';
import { QaRegressionTemplatesManager } from '../components/quality/QaRegressionTemplatesManager';
import { QualityPageShell } from '../components/quality/page/QualityPageShell';
import { useQualityPageSettings } from '../hooks/quality/page/useQualityPageSettings';

interface QualityRegressionPageProps {
  onNavigate?: (tab: string) => void;
  settingsVersion?: number;
  isActive?: boolean;
}

export const QualityRegressionPage: React.FC<QualityRegressionPageProps> = ({ onNavigate, settingsVersion }) => {
  const { settings } = useQualityPageSettings(settingsVersion);
  const [isTemplatesManagerOpen, setIsTemplatesManagerOpen] = useState(false);
  return (
    <QualityPageShell
      icon={Database}
      title="Validador Regressivo"
      description="Valide dados no Oracle com templates de asserções, variáveis e payloads de API."
    >
      {isTemplatesManagerOpen ? (
        <QaRegressionTemplatesManager onBack={() => setIsTemplatesManagerOpen(false)} />
      ) : (
        <QaRegressionRunner
          settings={settings}
          onNavigate={onNavigate}
          onOpenTemplatesManager={() => setIsTemplatesManagerOpen(true)}
        />
      )}
    </QualityPageShell>
  );
};
