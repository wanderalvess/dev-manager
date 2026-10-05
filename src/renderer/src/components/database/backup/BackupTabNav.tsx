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
    <div className="flex items-center px-6 py-2.5 border-b border-border/70 bg-muted/20 shrink-0 gap-1.5 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              isActive
                ? 'bg-background text-foreground shadow-xs border border-border/80 font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'opacity-70'}`} />
            <span>{tab.label}</span>
            {tab.indicator === 'active' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Agendamento ativo" />
            )}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-2xs font-mono leading-none ${
                  isActive
                    ? 'bg-primary/15 text-primary font-bold'
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
