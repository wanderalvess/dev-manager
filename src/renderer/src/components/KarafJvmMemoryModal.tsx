import React from 'react';
import { Activity } from 'lucide-react';
import { useJvmMemoryTelemetry } from '../hooks/jvmmemory/useJvmMemoryTelemetry';
import { useEscapeKey } from '../hooks/jvmmemory/useEscapeKey';
import { JvmHeapChart } from './jvmmemory/JvmHeapChart';
import { JvmMemoryAlerts } from './jvmmemory/JvmMemoryAlerts';
import { JvmMemoryHeader } from './jvmmemory/JvmMemoryHeader';
import { JvmMemoryCards } from './jvmmemory/JvmMemoryCards';
import { JvmMemoryFooter } from './jvmmemory/JvmMemoryFooter';
import { Modal } from './ui/Modal';

interface KarafJvmMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KarafJvmMemoryModal: React.FC<KarafJvmMemoryModalProps> = ({ isOpen, onClose }) => {
  const telemetry = useJvmMemoryTelemetry(isOpen);
  const { metrics, history } = telemetry;

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const alertLevel = metrics?.alertLevel || 'NORMAL';
  const isNearOom = metrics?.isNearOom || false;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      closeOnBackdrop={false}
    >
      <JvmMemoryHeader metrics={metrics} isNearOom={isNearOom} alertLevel={alertLevel} onClose={onClose} />

      {/* Content */}
      <div className="p-5 overflow-y-auto space-y-4 flex-1">
        <JvmMemoryAlerts
          metrics={metrics}
          isNearOom={isNearOom}
          alertLevel={alertLevel}
          fetchError={telemetry.fetchError}
          gcFeedback={telemetry.gcFeedback}
        />

        {/* Gráfico Visual */}
        <div className="p-3.5 bg-background border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" /> Curva de Consumo de Heap
            </span>
            <div className="text-[11px] font-mono tabular-nums text-muted-foreground flex items-center gap-3">
              <span>
                Usado: <strong className="text-foreground">{metrics?.heapUsedMb ?? 0} MB</strong>
              </span>
              <span className="text-border">|</span>
              <span>
                Capacidade: <strong className="text-foreground">{metrics?.heapMaxMb ?? 0} MB</strong>
              </span>
            </div>
          </div>
          <JvmHeapChart history={history} isNearOom={isNearOom} alertLevel={alertLevel} />
        </div>

        <JvmMemoryCards metrics={metrics} isNearOom={isNearOom} alertLevel={alertLevel} />
      </div>

      <JvmMemoryFooter
        autoRefresh={telemetry.autoRefresh}
        onAutoRefreshChange={telemetry.setAutoRefresh}
        refreshIntervalSec={telemetry.refreshIntervalSec}
        onRefreshIntervalChange={telemetry.setRefreshIntervalSec}
        isGcRunning={telemetry.isGcRunning}
        onTriggerGc={telemetry.handleTriggerGc}
        isLoading={telemetry.isLoading}
        onRefresh={telemetry.fetchMetrics}
      />
    </Modal>
  );
};
