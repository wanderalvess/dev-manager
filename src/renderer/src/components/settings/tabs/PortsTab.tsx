import React from 'react';
import { AppSettings, MonitoredPortConfig } from '../../../../../shared/types';
import { PortsMainCard } from '../ports/PortsMainCard';
import { PortsMonitoredCard } from '../ports/PortsMonitoredCard';
import { RemoteControlCard } from '../ports/RemoteControlCard';

interface PortsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  defaultPorts: MonitoredPortConfig[];
  handleResetPorts: () => void;
  handleAddPort: (port?: number, label?: string) => void;
  handleUpdatePort: (index: number, field: keyof MonitoredPortConfig, value: any) => void;
  handleRemovePort: (index: number) => void;
  onGoToKaraf: () => void;
  onOpenApm: () => void;
}

export const PortsTab: React.FC<PortsTabProps> = ({
  settings,
  setSettings,
  defaultPorts,
  handleResetPorts,
  handleAddPort,
  handleUpdatePort,
  handleRemovePort,
  onGoToKaraf,
  onOpenApm
}) => {
  return (
    <div className="space-y-4 flex-1 flex flex-col" id="field-ports">
      <div id="field-otlpPort">
        <PortsMainCard settings={settings} setSettings={setSettings} onGoToKaraf={onGoToKaraf} onOpenApm={onOpenApm} />
      </div>
      <PortsMonitoredCard
        ports={settings.monitoredPorts || defaultPorts}
        onReset={handleResetPorts}
        onAddPort={handleAddPort}
        onUpdatePort={handleUpdatePort}
        onRemovePort={handleRemovePort}
      />
      <RemoteControlCard />
    </div>
  );
};
