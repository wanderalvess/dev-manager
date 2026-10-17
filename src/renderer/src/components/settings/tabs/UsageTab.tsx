import React from 'react';
import type { AppSettings } from '../../../../../shared/types';
import { useUsageMetrics } from '../../../hooks/settings/useUsageMetrics';
import { requestConfirm } from '../../ui/confirmService';
import { showToast } from '../../ToastHost';
import { UsageControlsPanel } from '../usage/UsageControlsPanel';
import { UsageSummaryPanel } from '../usage/UsageSummaryPanel';

interface UsageTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const UsageTab: React.FC<UsageTabProps> = ({ settings, setSettings }) => {
  const { summary, loading, error, range, setRange, clearHistory } = useUsageMetrics();
  const enabled = settings.usageMetricsEnabled !== false;

  const handleClear = async () => {
    const confirmed = await requestConfirm({
      title: 'Apagar o histórico de uso?',
      message:
        'Todas as contagens de uso desta máquina serão apagadas, em todos os períodos. Isso não pode ser desfeito.\n\nAs configurações do app não são afetadas.',
      confirmLabel: 'Apagar histórico',
      tone: 'danger'
    });
    if (!confirmed) return;
    try {
      await clearHistory();
      showToast('Histórico de uso apagado.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível apagar o histórico.', 'error');
    }
  };

  return (
    <div className="space-y-4 flex flex-col flex-1" id="field-usage">
      <UsageControlsPanel
        enabled={enabled}
        onToggle={(next) => setSettings((prev) => ({ ...prev, usageMetricsEnabled: next }))}
        installId={summary?.installId ?? ''}
        hasHistory={Boolean(summary && summary.totalRuns > 0)}
        onClear={() => void handleClear()}
      />
      <UsageSummaryPanel summary={summary} loading={loading} error={error} range={range} onRangeChange={setRange} />
    </div>
  );
};
