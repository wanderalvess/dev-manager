import React from 'react';
import { Activity, X } from 'lucide-react';
import type { KarafJvmMemoryInfo } from '../../../../shared/types';
import { resolveStatusDotClass, resolveStatusTitle } from '../../utils/jvmMemoryModalUtils';

interface JvmMemoryHeaderProps {
  metrics: KarafJvmMemoryInfo | null;
  isNearOom: boolean;
  alertLevel: KarafJvmMemoryInfo['alertLevel'];
  onClose: () => void;
}

export const JvmMemoryHeader: React.FC<JvmMemoryHeaderProps> = ({ metrics, isNearOom, alertLevel, onClose }) => (
  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
    <div className="flex items-center space-x-3">
      <Activity className={`w-5 h-5 shrink-0 ${isNearOom ? 'text-rose-500 animate-pulse' : 'text-primary'}`} />
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
            Telemetria de Memória JVM
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/80 font-medium">
            JMX :8101 · KARAF
          </span>
          {metrics && (
            <span
              className={`w-2 h-2 rounded-full ${resolveStatusDotClass(isNearOom, alertLevel)}`}
              title={resolveStatusTitle(isNearOom, alertLevel)}
            />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
          Heap, Metaspace e monitoramento contínuo de OutOfMemoryError.
        </p>
      </div>
    </div>

    <button
      onClick={onClose}
      className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
      title="Fechar (ESC)"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
