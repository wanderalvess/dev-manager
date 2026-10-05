import React from 'react';
import { AppSettings, MonitoredPortConfig } from '../../../../../shared/types';
import { PortsMainCard } from '../ports/PortsMainCard';
import { PortsMonitoredCard } from '../ports/PortsMonitoredCard';

interface PortsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  defaultPorts: MonitoredPortConfig[];
  handleResetPorts: () => void;
  handleAddPort: (port?: number, label?: string) => void;
  handleUpdatePort: (index: number, field: keyof MonitoredPortConfig, value: any) => void;
  handleRemovePort: (index: number) => void;
}

export const PortsTab: React.FC<PortsTabProps> = ({
  settings,
  setSettings,
  defaultPorts,
  handleResetPorts,
  handleAddPort,
  handleUpdatePort,
  handleRemovePort
}) => {
  return (
    <div className="space-y-4 flex-1 flex flex-col" id="field-ports">
      <PortsMainCard settings={settings} setSettings={setSettings} />
      <PortsMonitoredCard
        ports={settings.monitoredPorts || defaultPorts}
        onReset={handleResetPorts}
        onAddPort={handleAddPort}
        onUpdatePort={handleUpdatePort}
        onRemovePort={handleRemovePort}
      />
    </div>
  );
};
