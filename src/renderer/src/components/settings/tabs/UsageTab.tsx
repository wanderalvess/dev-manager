import React from 'react';
import type { AppSettings } from '../../../../../shared/types';
import { dayKey } from '../../../../../shared/usageDates';
import { useUsageMetrics } from '../../../hooks/settings/useUsageMetrics';
import { useUsageImpact } from '../../../hooks/settings/useUsageImpact';
import { downloadBlob } from '../../../utils/databaseExportUtils';
import {
  buildImpactCsv,
  impactCsvFilename,
  resetBaselineOverride,
  setBaselineOverride
} from '../../../utils/usageImpactViewUtils';
import { requestConfirm } from '../../ui/confirmService';
import { showToast } from '../../ToastHost';
import { UsageControlsPanel } from '../usage/UsageControlsPanel';
import { UsageImpactPanel } from '../usage/UsageImpactPanel';
import { UsageSummaryPanel } from '../usage/UsageSummaryPanel';

interface UsageTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const UsageTab: React.FC<UsageTabProps> = ({ settings, setSettings }) => {
  const { summary, loading, error, range, setRange, clearHistory } = useUsageMetrics();
  const impactState = useUsageImpact(settings.usageBaselines);
  const enabled = settings.usageMetricsEnabled !== false;

  const handleClear = async () => {
    const confirmed = await requestConfirm({
      title: 'Apagar o histórico de uso?',
      message:
        'Todas as contagens de uso desta máquina serão apagadas, em todos os períodos, e o tempo economizado volta a zero. Isso não pode ser desfeito.\n\nAs configurações do app, inclusive o tempo que você informou para cada automação, não são afetadas.',
      confirmLabel: 'Apagar histórico',
      tone: 'danger'
    });
    if (!confirmed) return;
    try {
      await clearHistory();
      await impactState.reload();
      showToast('Histórico de uso apagado.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível apagar o histórico.', 'error');
    }
  };

  const handleChangeBaseline = (key: string, minutes: number) =>
    setSettings((prev) => ({
      ...prev,
      usageBaselines: setBaselineOverride(prev.usageBaselines, key, minutes, dayKey(new Date()))
    }));

  const handleResetBaseline = (key: string) =>
    setSettings((prev) => ({ ...prev, usageBaselines: resetBaselineOverride(prev.usageBaselines, key) }));

  const handleExport = () => {
    if (!impactState.impact) return;
    downloadBlob(buildImpactCsv(impactState.impact), impactCsvFilename(impactState.impact.today), 'text/csv;charset=utf-8;');
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
      <UsageImpactPanel
        impact={impactState.impact}
        loading={impactState.loading}
        error={impactState.error}
        onChangeBaseline={handleChangeBaseline}
        onResetBaseline={handleResetBaseline}
        onExport={handleExport}
      />
      <UsageSummaryPanel summary={summary} loading={loading} error={error} range={range} onRangeChange={setRange} />
    </div>
  );
};
