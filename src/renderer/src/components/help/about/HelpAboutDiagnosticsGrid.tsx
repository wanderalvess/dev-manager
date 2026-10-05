import React from 'react';
import {
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Monitor,
  HardDrive,
  Laptop,
  FileText
} from 'lucide-react';
import { SystemAppInfo, UpdateStatus } from '../../../../../shared/types';
import { HelpAboutUpdateCard } from './HelpAboutUpdateCard';

interface HelpAboutDiagnosticsGridProps {
  appInfo: SystemAppInfo | null;
  updateStatus: UpdateStatus | null;
  memoryUsagePercent: number;
  handleCheckForUpdates: () => void;
  handleOpenChangelog: () => void;
}

export const HelpAboutDiagnosticsGrid: React.FC<HelpAboutDiagnosticsGridProps> = ({
  appInfo,
  updateStatus,
  memoryUsagePercent,
  handleCheckForUpdates,
  handleOpenChangelog
}) => (
  <>
    <div className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
      <Cpu className="w-4 h-4 text-primary" />
      <span>Diagnóstico do Ambiente de Execução</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
      {/* UAC / Permissão */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
          Elevação UAC (Windows):
        </span>
        <div className="flex items-center space-x-1.5 font-bold">
          {appInfo?.isAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500">Modo Administrador (Ativo)</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-amber-500">Usuário Padrão (Sem Elevação)</span>
            </>
          )}
        </div>
      </div>

      {/* Sistema Operacional */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
          Sistema Operacional:
        </span>
        <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold truncate">
          <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="truncate">
            {appInfo ? `Windows (${appInfo.osRelease} ${appInfo.osArch})` : 'Carregando...'}
          </span>
        </div>
      </div>

      {/* Memória RAM */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Memória RAM do Sistema:
          </span>
          <span className="text-[10px] font-mono text-primary font-bold">
            {memoryUsagePercent}% em uso
          </span>
        </div>
        <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold">
          <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px]">
            {appInfo
              ? `${appInfo.freeMemoryMb} MB livres de ${appInfo.totalMemoryMb} MB`
              : 'Carregando...'}
          </span>
        </div>
        {/* Barra de Progresso de Memória */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${memoryUsagePercent}%` }}
          />
        </div>
      </div>

      {/* Versão Electron & Chromium */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
          Runtimes Desktop:
        </span>
        <div className="font-mono text-foreground text-[11px] truncate">
          Electron <strong className="text-primary">v{appInfo?.electronVersion}</strong> • Chrome{' '}
          <strong>v{appInfo?.chromeVersion}</strong>
        </div>
      </div>

      {/* Versão Node & V8 */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
          Motor JavaScript:
        </span>
        <div className="font-mono text-foreground text-[11px] truncate">
          Node.js <strong className="text-emerald-500">v{appInfo?.nodeVersion}</strong> • V8{' '}
          <strong>v{appInfo?.v8Version}</strong>
        </div>
      </div>

      {/* Hostname */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
          Nome da Máquina (Host):
        </span>
        <div className="font-mono text-foreground text-[11px] truncate flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{appInfo?.osHostname || 'Localhost'}</span>
        </div>
      </div>

      {/* Versão do App & Atualizações */}
      {Boolean(window.electronAPI?.onUpdateStatus) && (
        <HelpAboutUpdateCard
          appInfo={appInfo}
          updateStatus={updateStatus}
          handleCheckForUpdates={handleCheckForUpdates}
        />
      )}

      {/* Notas de Versão / Changelog */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border flex items-center justify-between gap-2 shadow-xs">
        <div className="min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Notas de Versão
          </span>
          <span className="text-[11px] text-foreground truncate block">Histórico de mudanças e melhorias</span>
        </div>
        <button
          onClick={handleOpenChangelog}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-bold transition cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" /> Ver Changelog
        </button>
      </div>
    </div>
  </>
);
