import React from 'react';
import { SystemAppInfo, UpdateStatus } from '../../../../../shared/types';
import { HelpAboutAppHeader } from '../about/HelpAboutAppHeader';
import { HelpAboutDiagnosticsGrid } from '../about/HelpAboutDiagnosticsGrid';
import { HelpAboutConfigPath } from '../about/HelpAboutConfigPath';
import { HelpAboutPackagingPanel } from '../about/HelpAboutPackagingPanel';
import { HelpAboutStackPanel } from '../about/HelpAboutStackPanel';

interface HelpAboutTabProps {
  appInfo: SystemAppInfo | null;
  updateStatus: UpdateStatus | null;
  memoryUsagePercent: number;
  copiedDiag: boolean;
  copiedItem: string | null;
  handleCopyDiagnostic: () => void;
  handleCheckForUpdates: () => void;
  handleOpenChangelog: () => void;
  copyToClipboard: (text: string, key?: string) => void;
}

export const HelpAboutTab: React.FC<HelpAboutTabProps> = ({
  appInfo,
  updateStatus,
  memoryUsagePercent,
  copiedDiag,
  copiedItem,
  handleCopyDiagnostic,
  handleCheckForUpdates,
  handleOpenChangelog,
  copyToClipboard
}) => {
  return (
    <div className="space-y-4">
      {/* Informações da Aplicação & Banner */}
      <div className="cockpit-panel rounded-xl p-5 sm:p-6 border border-border space-y-4 shadow-md">
        <HelpAboutAppHeader
          appInfo={appInfo}
          copiedDiag={copiedDiag}
          handleCopyDiagnostic={handleCopyDiagnostic}
        />

        {/* Tabela de Diagnóstico Técnico da Máquina */}
        <div className="pt-3 border-t border-border space-y-3">
          <HelpAboutDiagnosticsGrid
            appInfo={appInfo}
            updateStatus={updateStatus}
            memoryUsagePercent={memoryUsagePercent}
            handleCheckForUpdates={handleCheckForUpdates}
            handleOpenChangelog={handleOpenChangelog}
          />

          {/* Caminho do Config JSON */}
          {appInfo?.configPath && (
            <HelpAboutConfigPath
              configPath={appInfo.configPath}
              copiedItem={copiedItem}
              copyToClipboard={copyToClipboard}
            />
          )}
        </div>
      </div>

      <HelpAboutPackagingPanel
        appInfo={appInfo}
        copiedItem={copiedItem}
        copyToClipboard={copyToClipboard}
      />

      <HelpAboutStackPanel />
    </div>
  );
};
