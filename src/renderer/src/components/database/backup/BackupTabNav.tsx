import React from 'react';
import { HardDriveDownload, CalendarClock, FileArchive, History, Webhook } from 'lucide-react';
import type { BackupTabId } from '../../../hooks/database/useBackupForm';

interface BackupTabNavProps {
  activeTab: BackupTabId;
  onChange: (tab: BackupTabId) => void;
  scheduleActive: boolean;
  filesCount: number;
  historyCount: number;
  webhooksCount: number;
}

export const BackupTabNav: React.FC<BackupTabNavProps> = ({
  activeTab,
  onChange,
  scheduleActive,
  filesCount,
  historyCount,
  webhooksCount
}) => {
  const tabs: { id: BackupTabId; label: string; icon: typeof HardDriveDownload; indicator?: 'active'; count?: number }[] = [
    { id: 'backup', label: 'Executar Backup', icon: HardDriveDownload },
    {
      id: 'schedule',
      label: 'Agendamento & Retenção',
      icon: CalendarClock,
      indicator: scheduleActive ? 'active' : undefined
    },
    { id: 'files', label: 'Arquivos na Pasta', icon: FileArchive, count: filesCount },
    { id: 'history', label: 'Histórico', icon: History, count: historyCount },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook, count: webhooksCount }
  ];

  return (
    <div className="flex items-center px-6 border-b border-border bg-card shrink-0 gap-6 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-3 text-sm transition-colors shrink-0 cursor-pointer border-b-2 -mb-px ${
              isActive
                ? 'text-foreground font-medium border-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'opacity-70'}`} />
            <span>{tab.label}</span>
            {tab.indicator === 'active' && (
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="Agendamento ativo" />
            )}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium leading-none ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
