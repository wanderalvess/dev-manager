import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HardDriveDownload,
  CalendarClock,
  FileArchive,
  History,
  Webhook,
  FolderOpen,
  Terminal,
  Zap,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
  Check,
  Download,
  Plus,
  Edit2,
  SlidersHorizontal,
  FlaskConical,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import {
  DatabaseConnectionConfig,
  DatabaseType,
  AppSettings,
  BackupConfig,
  BackupResult,
  BackupFileInfo,
  BackupHistoryEntry,
  BackupWebhookConfig
} from '../../../../shared/types';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { getDefaultBackupCommandTemplate, resolveBackupCommandPreview } from '../../utils/backupCommandPreview';

const CRON_PRESETS = ['0 * * * *', '0 */6 * * *', '0 2 * * *', '0 2 * * 0'];

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnection: DatabaseConnectionConfig | null;
  connections: DatabaseConnectionConfig[];
  settings: AppSettings | null;
  onSettingsUpdate?: (updater: (prev: AppSettings | null) => AppSettings | null) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  activeConnection,
  connections,
  settings,
  onSettingsUpdate
}) => {
  const [backupActiveTab, setBackupActiveTab] = useState<'backup' | 'schedule' | 'files' | 'history' | 'webhooks'>('backup');
  const [backupFolder, setBackupFolder] = useState<string>('');
  const [isRunningBackup, setIsRunningBackup] = useState<boolean>(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);
  const [isLoadingBackupFiles, setIsLoadingBackupFiles] = useState<boolean>(false);
  const [backupCron, setBackupCron] = useState<string>('');
  const [backupScheduleEnabled, setBackupScheduleEnabled] = useState<boolean>(true);
  const [backupRetentionCount, setBackupRetentionCount] = useState<string>('');
  const [backupRetentionDays, setBackupRetentionDays] = useState<string>('');
  const [backupCompress, setBackupCompress] = useState<boolean>(false);
  const [backupOracleDirectory, setBackupOracleDirectory] = useState<string>('');
  const [useCustomBackupCommand, setUseCustomBackupCommand] = useState<boolean>(false);
  const [customBackupCommand, setCustomBackupCommand] = useState<string>('');
  const [showPasswordInCommandPreview, setShowPasswordInCommandPreview] = useState<boolean>(false);
  const [commandCopied, setCommandCopied] = useState<boolean>(false);
  const [drillCron, setDrillCron] = useState<string>('');
  const [drillScheduleEnabled, setDrillScheduleEnabled] = useState<boolean>(true);
  const [drillScratchConnectionId, setDrillScratchConnectionId] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleSaveResult, setScheduleSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [restoringFilePath, setRestoringFilePath] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<BackupResult | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [isLoadingBackupHistory, setIsLoadingBackupHistory] = useState<boolean>(false);

  // Webhooks de Notificação de Backup
  const [backupWebhooks, setBackupWebhooks] = useState<BackupWebhookConfig[]>([]);
  const [editingWebhook, setEditingWebhook] = useState<Partial<BackupWebhookConfig> | null>(null);
  const [isTestingWebhookId, setIsTestingWebhookId] = useState<string | null>(null);
  const [webhookTestResults, setWebhookTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Restore Drill
  const [scratchConnectionId, setScratchConnectionId] = useState<string>('');
  const [drillingFilePath, setDrillingFilePath] = useState<string | null>(null);
  const [drillResult, setDrillResult] = useState<BackupResult | null>(null);

  const { copy: copyCellToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getDbBadge = (type: DatabaseType) => {
    switch (type) {
      case 'oracle':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">ORACLE</span>;
      case 'mysql':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">MYSQL</span>;
      case 'postgres':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">POSTGRES</span>;
    }
  };

  // Carregar arquivos de backup já existentes na pasta de destino
  const refreshBackupFiles = useCallback(async (folder: string) => {
    if (!folder || !window.electronAPI?.listDbBackups) {
      setBackupFiles([]);
      return;
    }
    setIsLoadingBackupFiles(true);
    try {
      const files = await window.electronAPI.listDbBackups(folder);
      setBackupFiles(files || []);
    } catch (err) {
      console.error('Erro ao listar backups:', err);
    } finally {
      setIsLoadingBackupFiles(false);
    }
  }, []);

  // Carregar histórico persistido de backups/restaurações da conexão ativa
  const refreshBackupHistory = useCallback(async (connectionId: string) => {
    if (!window.electronAPI?.listDbBackupHistory) {
      setBackupHistory([]);
      return;
    }
    setIsLoadingBackupHistory(true);
    try {
      const history = await window.electronAPI.listDbBackupHistory(connectionId);
      setBackupHistory(history || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de backups:', err);
    } finally {
      setIsLoadingBackupHistory(false);
    }
  }, []);

  // Inicializa valores ao abrir o modal com base na conexão ativa
  useEffect(() => {
    if (!isOpen || !activeConnection) return;

    setBackupWebhooks(settings?.backupWebhooks || []);
    const saved = settings?.backupConfigs?.find((b) => b.connectionId === activeConnection.id);
    const folder = saved?.destinationFolder || '';
    setBackupFolder(folder);
    setBackupCron(saved?.cronExpression || '');
    setBackupScheduleEnabled(saved?.enabled !== false);
    setBackupRetentionCount(saved?.retentionCount !== undefined ? String(saved.retentionCount) : '');
    setBackupRetentionDays(saved?.retentionDays !== undefined ? String(saved.retentionDays) : '');
    setBackupCompress(Boolean(saved?.compress));
    setBackupOracleDirectory(saved?.oracleDirectory || 'DATA_PUMP_DIR');
    setUseCustomBackupCommand(Boolean(saved?.useCustomCommand));

    setCustomBackupCommand(saved?.customCommand || getDefaultBackupCommandTemplate(activeConnection.type));
    setBackupActiveTab('backup');
    setShowPasswordInCommandPreview(false);
    setCommandCopied(false);
    setDrillCron(saved?.restoreDrillCronExpression || '');
    setDrillScheduleEnabled(saved?.restoreDrillEnabled !== false);
    setDrillScratchConnectionId(saved?.restoreDrillScratchConnectionId || '');
    setBackupResult(null);
    setScheduleSaveResult(null);
    setRestoreResult(null);
    setDrillResult(null);
    setScratchConnectionId('');

    if (folder) refreshBackupFiles(folder);
    else setBackupFiles([]);
    refreshBackupHistory(activeConnection.id);
  }, [isOpen, activeConnection, settings, refreshBackupFiles, refreshBackupHistory]);

  // Preview formatado em tempo real do comando de backup
  const previewBackupCommandResolved = useMemo(
    () =>
      resolveBackupCommandPreview(activeConnection, {
        backupFolder,
        backupCompress,
        backupOracleDirectory,
        useCustomBackupCommand,
        customBackupCommand,
        showPassword: showPasswordInCommandPreview
      }),
    [activeConnection, backupFolder, backupCompress, backupOracleDirectory, useCustomBackupCommand, customBackupCommand, showPasswordInCommandPreview]
  );

  const handleSelectBackupFolder = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    const picked = await window.electronAPI.selectDirectory(backupFolder || undefined);
    if (picked) {
      setBackupFolder(picked);
      refreshBackupFiles(picked);
    }
  };

  const handleRunBackup = async () => {
    if (!activeConnection || !backupFolder.trim() || !window.electronAPI?.runDbBackup) return;
    setIsRunningBackup(true);
    setBackupResult(null);
    try {
      const res = await window.electronAPI.runDbBackup(
        activeConnection,
        backupFolder.trim(),
        activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : undefined,
        backupCompress,
        useCustomBackupCommand,
        useCustomBackupCommand ? customBackupCommand.trim() : undefined
      );
      setBackupResult(res);
      onSettingsUpdate?.((prev) => {
        if (!prev) return prev;
        const existing = prev.backupConfigs || [];
        const previous = existing.find((b) => b.connectionId === activeConnection.id);
        const entry: BackupConfig = {
          ...previous,
          connectionId: activeConnection.id,
          destinationFolder: backupFolder.trim(),
          oracleDirectory: activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : previous?.oracleDirectory,
          compress: backupCompress,
          useCustomCommand: useCustomBackupCommand,
          customCommand: customBackupCommand.trim() || undefined,
          lastRunAt: new Date().toISOString(),
          lastSuccess: res.success,
          lastMessage: res.message
        };
        return { ...prev, backupConfigs: [entry, ...existing.filter((b) => b.connectionId !== activeConnection.id)] };
      });
      if (res.success) refreshBackupFiles(backupFolder.trim());
      refreshBackupHistory(activeConnection.id);
    } catch (err: any) {
      setBackupResult({ success: false, message: err?.message || 'Erro inesperado ao executar backup.' });
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleSaveBackupSchedule = async () => {
    if (!activeConnection || !backupFolder.trim() || !window.electronAPI?.saveDbBackupConfig) return;
    setIsSavingSchedule(true);
    setScheduleSaveResult(null);
    try {
      const config: BackupConfig = {
        connectionId: activeConnection.id,
        destinationFolder: backupFolder.trim(),
        cronExpression: backupCron.trim() || undefined,
        enabled: backupScheduleEnabled,
        retentionCount: backupRetentionCount.trim() ? Number(backupRetentionCount.trim()) : undefined,
        retentionDays: backupRetentionDays.trim() ? Number(backupRetentionDays.trim()) : undefined,
        compress: backupCompress,
        oracleDirectory: activeConnection.type === 'oracle' ? backupOracleDirectory.trim() || undefined : undefined,
        useCustomCommand: useCustomBackupCommand,
        customCommand: customBackupCommand.trim() || undefined,
        restoreDrillCronExpression: drillCron.trim() || undefined,
        restoreDrillEnabled: drillScheduleEnabled,
        restoreDrillScratchConnectionId: drillScratchConnectionId || undefined
      };
      const res = await window.electronAPI.saveDbBackupConfig(config);
      setScheduleSaveResult(res);
      if (res.success) {
        onSettingsUpdate?.((prev) => {
          if (!prev) return prev;
          const existing = prev.backupConfigs || [];
          const previous = existing.find((b) => b.connectionId === activeConnection.id);
          const merged = { ...previous, ...config };
          return { ...prev, backupConfigs: [merged, ...existing.filter((b) => b.connectionId !== activeConnection.id)] };
        });
      }
    } catch (err: any) {
      setScheduleSaveResult({ success: false, message: err?.message || 'Erro inesperado ao salvar agendamento.' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleRestoreBackup = async (file: BackupFileInfo) => {
    if (!activeConnection || !window.electronAPI?.restoreDbBackup) return;

    const confirmed = window.confirm(
      `Restaurar "${file.fileName}" na conexão "${activeConnection.name}"?\n\n` +
        'Isso executa o backup contra o banco de dados AGORA e pode sobrescrever ou duplicar dados existentes. Essa ação não pode ser desfeita pelo Dev Manager.'
    );
    if (!confirmed) return;

    setRestoringFilePath(file.filePath);
    setRestoreResult(null);
    try {
      const res = await window.electronAPI.restoreDbBackup(activeConnection, file.filePath);
      setRestoreResult(res);
      refreshBackupHistory(activeConnection.id);
    } catch (err: any) {
      setRestoreResult({ success: false, message: err?.message || 'Erro inesperado ao restaurar backup.' });
    } finally {
      setRestoringFilePath(null);
    }
  };

  const handleRunRestoreDrill = async (file: BackupFileInfo) => {
    if (!scratchConnectionId || !window.electronAPI?.runDbRestoreDrill) return;
    const scratchConnection = connections.find((c) => c.id === scratchConnectionId);
    if (!scratchConnection) return;

    const confirmed = window.confirm(
      `Restaurar "${file.fileName}" na conexão "${scratchConnection.name}" como teste de integridade?\n\n` +
        'Use apenas uma conexão descartável aqui — essa restauração sobrescreve dados na conexão escolhida.'
    );
    if (!confirmed) return;

    setDrillingFilePath(file.filePath);
    setDrillResult(null);
    try {
      const res = await window.electronAPI.runDbRestoreDrill(scratchConnection, file.filePath);
      setDrillResult(res);
      if (activeConnection) refreshBackupHistory(activeConnection.id);
    } catch (err: any) {
      setDrillResult({ success: false, message: err?.message || 'Erro inesperado ao testar restauração.' });
    } finally {
      setDrillingFilePath(null);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebhook?.name || !editingWebhook?.endpointUrl) return;

    const webhookToSave: BackupWebhookConfig = {
      id: editingWebhook.id || `webhook_${Date.now()}`,
      name: editingWebhook.name.trim(),
      endpointUrl: editingWebhook.endpointUrl.trim(),
      method: editingWebhook.method || 'POST',
      authHeader: editingWebhook.authHeader?.trim() || undefined,
      authValue: editingWebhook.authValue?.trim() || undefined,
      enabled: editingWebhook.enabled !== undefined ? editingWebhook.enabled : true,
      events: editingWebhook.events && editingWebhook.events.length > 0 ? editingWebhook.events : undefined,
      platform: editingWebhook.platform || 'generic'
    };

    let updated: BackupWebhookConfig[];
    if (editingWebhook.id) {
      updated = backupWebhooks.map((w) => (w.id === editingWebhook.id ? webhookToSave : w));
    } else {
      updated = [...backupWebhooks, webhookToSave];
    }

    setBackupWebhooks(updated);
    await window.electronAPI?.saveSettings({ backupWebhooks: updated });
    onSettingsUpdate?.((prev) => (prev ? { ...prev, backupWebhooks: updated } : prev));
    setEditingWebhook(null);
  };

  const handleDeleteWebhook = async (id: string) => {
    const updated = backupWebhooks.filter((w) => w.id !== id);
    setBackupWebhooks(updated);
    await window.electronAPI?.saveSettings({ backupWebhooks: updated });
    onSettingsUpdate?.((prev) => (prev ? { ...prev, backupWebhooks: updated } : prev));
    if (editingWebhook?.id === id) setEditingWebhook(null);
  };

  const handleToggleWebhookEnabled = async (webhook: BackupWebhookConfig, enabled: boolean) => {
    const updated = backupWebhooks.map((w) => (w.id === webhook.id ? { ...w, enabled } : w));
    setBackupWebhooks(updated);
    await window.electronAPI?.saveSettings({ backupWebhooks: updated });
    onSettingsUpdate?.((prev) => (prev ? { ...prev, backupWebhooks: updated } : prev));
  };

  const handleTestWebhook = async (webhook: BackupWebhookConfig) => {
    if (!window.electronAPI?.testBackupWebhook) return;
    setIsTestingWebhookId(webhook.id);
    try {
      const res = await window.electronAPI.testBackupWebhook(webhook);
      setWebhookTestResults((prev) => ({ ...prev, [webhook.id]: res }));
    } catch (err: any) {
      setWebhookTestResults((prev) => ({
        ...prev,
        [webhook.id]: { success: false, message: err?.message || 'Falha ao testar webhook.' }
      }));
    } finally {
      setIsTestingWebhookId(null);
    }
  };

  const handleExportBackupHistoryCsv = () => {
    if (backupHistory.length === 0) return;

    const escapeCsv = (value: string): string => `"${value.replace(/"/g, '""')}"`;
    const header = ['startedAt', 'action', 'trigger', 'success', 'message', 'filePath', 'sizeBytes', 'durationMs', 'checksumSha256'];
    const rows = backupHistory.map((h) =>
      [
        h.startedAt,
        h.action,
        h.trigger,
        String(h.success),
        h.message,
        h.filePath || '',
        h.sizeBytes !== undefined ? String(h.sizeBytes) : '',
        h.durationMs !== undefined ? String(h.durationMs) : '',
        h.checksumSha256 || ''
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const connName = (activeConnection?.name || 'conexao').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `backup-history_${connName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !activeConnection) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shadow-xs shrink-0">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Backup & Restauração
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground">
                  {activeConnection.name}
                </span>
                {getDbBadge(activeConnection.type)}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>{activeConnection.user}@{activeConnection.host}:{activeConnection.port || (activeConnection.type === 'oracle' ? 1521 : activeConnection.type === 'mysql' ? 3306 : 5432)}</span>
                <span className="text-border">/</span>
                <span className="text-foreground/80 font-semibold">{activeConnection.database}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted/80 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Strip */}
        <div className="flex items-center px-6 py-2.5 border-b border-border/70 bg-muted/20 shrink-0 gap-1.5 overflow-x-auto">
          {[
            { id: 'backup', label: 'Executar Backup', icon: HardDriveDownload },
            {
              id: 'schedule',
              label: 'Agendamento & Retenção',
              icon: CalendarClock,
              indicator: backupCron && backupScheduleEnabled ? 'active' : undefined
            },
            {
              id: 'files',
              label: 'Arquivos na Pasta',
              icon: FileArchive,
              count: backupFiles.length
            },
            {
              id: 'history',
              label: 'Histórico',
              icon: History,
              count: backupHistory.length
            },
            {
              id: 'webhooks',
              label: 'Webhooks',
              icon: Webhook,
              count: backupWebhooks.length
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = backupActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBackupActiveTab(tab.id as any)}
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
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-none ${
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

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {/* ABA 1: EXECUTAR BACKUP */}
          {backupActiveTab === 'backup' && (
            <div className="space-y-4 animate-fade-in">
              {/* Seção 1: Destino */}
              <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span>
                      {activeConnection.type === 'oracle' && !useCustomBackupCommand
                        ? 'Pasta do DIRECTORY (no servidor Oracle)'
                        : 'Pasta de Destino do Backup'}
                    </span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {backupFolder ? 'Destino selecionado' : 'Pasta pendente'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={backupFolder}
                    onChange={(e) => setBackupFolder(e.target.value)}
                    placeholder="Ex: C:\Backups\WinThor"
                    className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleSelectBackupFolder}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border/80 transition flex items-center gap-1.5 shrink-0 font-semibold text-xs shadow-2xs cursor-pointer"
                    title="Procurar pasta no disco"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-primary" />
                    <span>Procurar...</span>
                  </button>
                </div>

                {activeConnection.type === 'oracle' ? (
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {useCustomBackupCommand
                      ? 'Esta pasta resolverá as variáveis {filePath} e {folder}. Utilizando exp clássico, os arquivos são salvos diretamente neste caminho da sua máquina.'
                      : 'O utilitário expdp salva os arquivos no servidor Oracle. O caminho da pasta aqui deve coincidir com o local físico do DIRECTORY abaixo.'}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    O arquivo de backup gerado pelo utilitário ({activeConnection.type === 'mysql' ? 'mysqldump' : 'pg_dump'}) será gravado nesta pasta local.
                  </p>
                )}
              </div>

              {/* Seção 2: Modo de Comando */}
              <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/50 pb-3">
                  <div>
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-sky-500" />
                      <span>Modo de Execução do Comando</span>
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Escolha o modo padrão assistido ou customize comandos e parâmetros para compatibilidade com versões específicas do banco.
                    </p>
                  </div>

                  <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 self-start sm:self-auto shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setUseCustomBackupCommand(false)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                        !useCustomBackupCommand
                          ? 'bg-background text-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Padrão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCustomBackupCommand(true)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                        useCustomBackupCommand
                          ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Personalizado</span>
                    </button>
                  </div>
                </div>

                {/* MODO PADRÃO */}
                {!useCustomBackupCommand ? (
                  <div className="space-y-3 pt-1">
                    {activeConnection.type === 'oracle' && (
                      <div className="space-y-1">
                        <label className="block font-bold text-foreground text-xs">DIRECTORY Oracle</label>
                        <input
                          type="text"
                          value={backupOracleDirectory}
                          onChange={(e) => setBackupOracleDirectory(e.target.value)}
                          placeholder="DATA_PUMP_DIR"
                          className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Nome do objeto DIRECTORY registrado no Oracle (ex: <code>DATA_PUMP_DIR</code>). O schema exportado é o usuário da conexão (<code>{activeConnection.user}</code>).
                        </p>
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
                      <input
                        type="checkbox"
                        checked={backupCompress}
                        onChange={(e) => setBackupCompress(e.target.checked)}
                        className="text-primary focus:ring-0 rounded"
                      />
                      <span className="text-foreground text-xs font-medium">
                        Compactar backup
                        {activeConnection.type === 'postgres' && ' (formato binário customizado, -Fc)'}
                        {activeConnection.type === 'mysql' && ' (compressão via gzip streaming)'}
                        {activeConnection.type === 'oracle' && ' (compression=ALL, requer Oracle Enterprise Edition)'}
                      </span>
                    </label>

                    {/* Preview do comando padrão */}
                    <div className="mt-2.5 p-3.5 bg-muted/40 border border-border/70 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Terminal className="w-3 h-3 text-primary" /> Linha de Comando Gerada (Automática)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUseCustomBackupCommand(true);
                              setCustomBackupCommand(previewBackupCommandResolved);
                            }}
                            className="px-2 py-0.5 text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Editar como personalizado
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(previewBackupCommandResolved);
                              setCommandCopied(true);
                              setTimeout(() => setCommandCopied(false), 2000);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 text-muted-foreground hover:text-foreground text-[10px] font-medium rounded-md hover:bg-muted transition cursor-pointer"
                            title="Copiar comando"
                          >
                            {commandCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{commandCopied ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                      <pre className="font-mono text-[11px] p-2.5 bg-background/90 rounded-lg border border-border/60 text-foreground overflow-x-auto whitespace-pre-wrap break-all select-all leading-relaxed">
                        {previewBackupCommandResolved}
                      </pre>
                    </div>
                  </div>
                ) : (
                  /* MODO PERSONALIZADO */
                  <div className="space-y-4 pt-1">
                    {/* Presets Rápidos */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" /> Modelos Recomendados (Presets Rápidos):
                        </span>
                        <span className="text-[10px] text-muted-foreground">Clique em um modelo para carregar</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeConnection.type === 'oracle' ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomBackupCommand(
                                  'expdp {user}@{connectString} directory={directory} dumpfile={fileName} logfile={logFileName} schemas={user}'
                                )
                              }
                              className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-[11px] font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
                            >
                              expdp (Padrão)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomBackupCommand(
                                  'expdp {user}@{connectString} directory={directory} dumpfile={fileName} logfile={logFileName} schemas={user} version=11.2 exclude=statistics'
                                )
                              }
                              className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-[11px] font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
                              title="Compatível com Oracle 11g e desabilita estatísticas para acelerar"
                            >
                              expdp (Compatível 11g + Sem Estatísticas)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomBackupCommand(
                                  'exp {user}/{password}@{connectString} file="{filePath}" log="{logPath}" owner={user} buffer=65536 direct=y consistent=y statistics=none'
                                )
                              }
                              className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-[11px] font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
                              title="Export clássico direto no disco do cliente (sem depender do DATA_PUMP_DIR do servidor)"
                            >
                              exp (Export Clássico / Local)
                            </button>
                          </>
                        ) : activeConnection.type === 'mysql' ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomBackupCommand(
                                  'mysqldump -h {host} -P {port} -u {user} {database} --result-file="{filePath}"'
                                )
                              }
                              className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-[11px] font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
                            >
                              mysqldump (Padrão)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomBackupCommand(
                                  'mysqldump -h {host} -P {port} -u {user} --single-transaction --quick {database} --result-file="{filePath}"'
                                )
                              }
                              className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-[11px] font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
                            >
                              mysqldump (Transacional)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomBackupCommand(
                                  'pg_dump -h {host} -p {port} -U {user} -d {database} -F c -b -v -f "{filePath}"'
                                )
                              }
                              className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-[11px] font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
                            >
                              pg_dump (-Fc Custom Binário)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomBackupCommand(
                                  'pg_dump -h {host} -p {port} -U {user} -d {database} -F p -f "{filePath}"'
                                )
                              }
                              className="px-2.5 py-1.5 bg-muted/80 hover:bg-muted text-foreground rounded-lg text-[11px] font-mono border border-border/70 transition shadow-2xs hover:border-primary/50 cursor-pointer"
                            >
                              pg_dump (Plain SQL)
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chips com Variáveis Categorizadas */}
                    <div className="space-y-2 p-3 bg-muted/30 border border-border/60 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Variáveis Disponíveis (clique para inserir):
                        </span>
                        <span className="text-[10px] text-amber-500 font-mono font-semibold">
                          * tag {'{filePath}'} ou {'{fileName}'} é obrigatória
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="text-muted-foreground font-semibold shrink-0 w-20">Arquivo:</span>
                          {[
                            { tag: '{filePath}', req: true, tip: 'Caminho completo do arquivo gerado' },
                            { tag: '{fileName}', req: true, tip: 'Nome simples do arquivo de dump' },
                            { tag: '{folder}', req: false, tip: 'Diretório de destino selecionado' }
                          ].map((item) => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => setCustomBackupCommand((prev) => (prev ? `${prev} ${item.tag}` : item.tag))}
                              className={`px-2 py-0.5 rounded-md font-mono text-[11px] border transition flex items-center gap-1 shadow-2xs cursor-pointer ${
                                item.req
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-semibold'
                                  : 'bg-background border-border text-foreground hover:bg-muted'
                              }`}
                              title={item.tip}
                            >
                              <span>{item.tag}</span>
                              {item.req && <span className="text-[9px] opacity-75 font-sans">(obrigatório)</span>}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="text-muted-foreground font-semibold shrink-0 w-20">Conexão:</span>
                          {['{user}', '{password}', '{connectString}', '{host}', '{port}', '{database}'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setCustomBackupCommand((prev) => (prev ? `${prev} ${tag}` : tag))}
                              className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-background border border-border text-foreground hover:bg-muted transition shadow-2xs cursor-pointer"
                              title={`Inserir ${tag}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="text-muted-foreground font-semibold shrink-0 w-20">Utilitários:</span>
                          {['{directory}', '{logPath}', '{timestamp}'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setCustomBackupCommand((prev) => (prev ? `${prev} ${tag}` : tag))}
                              className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-background border border-border text-foreground hover:bg-muted transition shadow-2xs cursor-pointer"
                              title={`Inserir ${tag}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Console do Utilitário CLI */}
                    <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1.5 select-none">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                          </div>
                          <span className="text-slate-400 font-mono text-[11px] font-semibold flex items-center gap-1 ml-1">
                            <Terminal className="w-3.5 h-3.5 text-sky-400" />
                            <span>Console do Comando de Backup</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {customBackupCommand.includes('{filePath}') || customBackupCommand.includes('{fileName}') ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Sintaxe Válida</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Requer {'{filePath}'}</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowPasswordInCommandPreview((prev) => !prev)}
                            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer"
                            title={showPasswordInCommandPreview ? 'Ocultar senha' : 'Exibir senha real'}
                          >
                            {showPasswordInCommandPreview ? (
                              <>
                                <EyeOff className="w-3 h-3 text-amber-400" />
                                <span>Ocultar Senha</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Ver Senha</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(previewBackupCommandResolved);
                              setCommandCopied(true);
                              setTimeout(() => setCommandCopied(false), 2000);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer"
                            title="Copiar comando resolvido"
                          >
                            {commandCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{commandCopied ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Editor de Entrada */}
                      <div className="relative">
                        <textarea
                          rows={3}
                          value={customBackupCommand}
                          onChange={(e) => setCustomBackupCommand(e.target.value)}
                          placeholder='Ex: exp {user}/{password}@{connectString} file="{filePath}" log="{logPath}" owner={user}'
                          className="w-full bg-slate-950 text-slate-100 p-3.5 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-sky-500/50 resize-y min-h-[85px] border-b border-slate-800/80"
                        />
                      </div>

                      {/* Live Preview Console Output */}
                      <div className="p-3 bg-slate-900/60 font-mono text-[11px] leading-relaxed">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1 select-none">
                          <span>Visualização com Parâmetros Reais (Passados Diretamente ao Executável)</span>
                          <span className="text-[9px] text-slate-500 font-mono">execFile sem shell</span>
                        </div>
                        <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre-wrap break-all select-all flex items-start gap-2">
                          <span className="text-sky-400 select-none font-bold shrink-0">&gt;_</span>
                          <span>{previewBackupCommandResolved || '(digite um comando acima para ver a prévia)'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção 3: Execução e Feedback */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleRunBackup}
                  disabled={
                    isRunningBackup ||
                    !backupFolder.trim() ||
                    (useCustomBackupCommand && !customBackupCommand.includes('{filePath}') && !customBackupCommand.includes('{fileName}'))
                  }
                  className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 text-sm tracking-wide cursor-pointer"
                >
                  {isRunningBackup ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Executando Backup...</span>
                    </>
                  ) : (
                    <>
                      <HardDriveDownload className="w-4 h-4" />
                      <span>Fazer Backup Agora</span>
                    </>
                  )}
                </button>

                {useCustomBackupCommand && (!customBackupCommand.includes('{filePath}') && !customBackupCommand.includes('{fileName}')) && (
                  <p className="text-[11px] text-amber-500 flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Para iniciar o backup personalizado, inclua a tag <code>{'{filePath}'}</code> ou <code>{'{fileName}'}</code> no comando.</span>
                  </p>
                )}

                {backupResult && (
                  <div
                    className={`p-4 rounded-xl border ${
                      backupResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 font-bold">
                      {backupResult.success ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="break-all text-xs">{backupResult.message}</span>
                        {backupResult.success && backupResult.sizeBytes !== undefined && (
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono opacity-90 mt-1.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                              Tamanho: {formatBytes(backupResult.sizeBytes)}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                              Duração: {backupResult.durationMs} ms
                            </span>
                          </div>
                        )}
                        {backupResult.success && backupResult.checksumSha256 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-mono opacity-80 truncate" title={backupResult.checksumSha256}>
                              SHA-256: {backupResult.checksumSha256}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCellToClipboard(backupResult.checksumSha256!, 'result-hash')}
                              className="text-[10px] px-1.5 py-0.2 rounded hover:bg-emerald-500/20 font-mono transition cursor-pointer"
                              title="Copiar hash"
                            >
                              {copyFeedback === 'result-hash' ? '✓ Copiado' : 'Copiar hash'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: AGENDAMENTO & RETENÇÃO */}
          {backupActiveTab === 'schedule' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-3">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-primary" /> Frequência de Execução Automática (Cron)
                </span>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={backupCron}
                    onChange={(e) => setBackupCron(e.target.value)}
                    className="flex-1 bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                  >
                    <option value="">Sem agendamento (somente manual)</option>
                    <option value="0 * * * *">A cada hora (0 * * * *)</option>
                    <option value="0 */6 * * *">A cada 6 horas (0 */6 * * *)</option>
                    <option value="0 2 * * *">Diário às 02:00 (0 2 * * *)</option>
                    <option value="0 2 * * 0">Semanal (domingo às 02:00)</option>
                    {backupCron && !CRON_PRESETS.includes(backupCron) && (
                      <option value={backupCron}>Personalizado: {backupCron}</option>
                    )}
                  </select>
                  <input
                    type="text"
                    value={backupCron}
                    onChange={(e) => setBackupCron(e.target.value)}
                    placeholder="cron: 0 2 * * *"
                    className="w-full sm:w-44 bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={backupScheduleEnabled}
                    onChange={(e) => setBackupScheduleEnabled(e.target.checked)}
                    disabled={!backupCron.trim()}
                    className="text-primary focus:ring-0 rounded"
                  />
                  <span className="font-semibold text-foreground text-xs">Ativar rotina agendada</span>
                </label>
              </div>

              <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-3">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-primary" /> Política de Retenção de Backups
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Os arquivos mais antigos são limpos automaticamente após cada execução conforme as regras abaixo:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Manter quantidade máxima</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={backupRetentionCount}
                        onChange={(e) => setBackupRetentionCount(e.target.value)}
                        placeholder="Ilimitado"
                        className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                      />
                      <span className="text-muted-foreground shrink-0 text-xs">arquivos</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Idade máxima dos arquivos</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={backupRetentionDays}
                        onChange={(e) => setBackupRetentionDays(e.target.value)}
                        placeholder="Sem limite"
                        className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                      />
                      <span className="text-muted-foreground shrink-0 text-xs">dias</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-3">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-cyan-500" /> Restore Drill Automático (Teste Periódico)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Restaura automaticamente o backup mais recente gerado contra uma base de teste descartável (scratch) para certificar a integridade dos dados.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <select
                      value={drillCron}
                      onChange={(e) => setDrillCron(e.target.value)}
                      className="flex-1 bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                    >
                      <option value="">Sem drill agendado</option>
                      <option value="0 4 * * *">Diário às 04:00</option>
                      <option value="0 4 * * 0">Semanal (domingo às 04:00)</option>
                      {drillCron && !['0 4 * * *', '0 4 * * 0'].includes(drillCron) && (
                        <option value={drillCron}>Personalizado: {drillCron}</option>
                      )}
                    </select>
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground shrink-0 select-none">
                      <input
                        type="checkbox"
                        checked={drillScheduleEnabled}
                        onChange={(e) => setDrillScheduleEnabled(e.target.checked)}
                        disabled={!drillCron.trim()}
                        className="text-primary focus:ring-0 rounded"
                      />
                      <span className="text-xs font-semibold text-foreground">Ativo</span>
                    </label>
                  </div>

                  <div>
                    <select
                      value={drillScratchConnectionId}
                      onChange={(e) => setDrillScratchConnectionId(e.target.value)}
                      className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="">Conexão scratch...</option>
                      {connections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveBackupSchedule}
                disabled={isSavingSchedule || !backupFolder.trim()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-md hover:bg-primary/90 transition disabled:opacity-50 text-xs cursor-pointer"
              >
                <CalendarClock className={`w-4 h-4 ${isSavingSchedule ? 'animate-spin' : ''}`} />
                <span>{isSavingSchedule ? 'Salvando Configurações...' : 'Salvar Configurações de Agendamento'}</span>
              </button>

              {scheduleSaveResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    scheduleSaveResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {scheduleSaveResult.message}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: ARQUIVOS & RESTAURAÇÃO */}
          {backupActiveTab === 'files' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/40 border border-border/70 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-xs">Backups na Pasta</span>
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-xs" title={backupFolder}>
                    ({backupFolder || 'nenhuma pasta definida'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={scratchConnectionId}
                    onChange={(e) => setScratchConnectionId(e.target.value)}
                    className="bg-background border border-border/80 rounded-lg p-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Conexão scratch para teste...</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => refreshBackupFiles(backupFolder)}
                    disabled={!backupFolder.trim() || isLoadingBackupFiles}
                    className="p-1.5 hover:text-foreground text-muted-foreground rounded-lg hover:bg-muted transition disabled:opacity-50 cursor-pointer"
                    title="Recarregar arquivos"
                  >
                    <RotateCw className={`w-4 h-4 ${isLoadingBackupFiles ? 'animate-spin text-primary' : ''}`} />
                  </button>
                </div>
              </div>

              {restoreResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    restoreResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {restoreResult.message}
                </div>
              )}

              {drillResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    drillResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {drillResult.message}
                  {drillResult.success && drillResult.checksumSha256 && (
                    <p className="text-[10px] font-mono opacity-80 mt-1 truncate">
                      SHA-256: {drillResult.checksumSha256}
                    </p>
                  )}
                </div>
              )}

              {backupFiles.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/20 border border-border/60 rounded-xl space-y-1">
                  <FileArchive className="w-8 h-8 mx-auto opacity-40 text-muted-foreground mb-2" />
                  <p className="font-semibold text-xs text-foreground">Nenhum arquivo de backup encontrado</p>
                  <p className="text-[11px]">Nenhum arquivo (.dmp, .sql, .dump) foi localizado na pasta de destino selecionada.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {backupFiles.map((f) => (
                    <div
                      key={f.filePath}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-background/70 border border-border/70 rounded-xl gap-2 hover:border-border transition shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground truncate" title={f.filePath}>
                            {f.fileName}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-muted border border-border/60 text-muted-foreground shrink-0">
                            {f.fileName.split('.').pop()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono mt-1">
                          <span>{formatBytes(f.sizeBytes)}</span>
                          <span>·</span>
                          <span>{new Date(f.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleRunRestoreDrill(f)}
                          disabled={!scratchConnectionId || drillingFilePath !== null}
                          title="Testar restauração numa conexão descartável (não afeta o banco ativo)"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          {drillingFilePath === f.filePath ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FlaskConical className="w-3.5 h-3.5" />
                          )}
                          <span>Restore Drill</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestoreBackup(f)}
                          disabled={restoringFilePath !== null}
                          title="Restaurar este backup na conexão ativa (sobrescreve dados existentes)"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          {restoringFilePath === f.filePath ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          <span>Restaurar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: HISTÓRICO */}
          {backupActiveTab === 'history' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/70 rounded-xl">
                <span className="font-bold text-foreground text-xs">Histórico de Execuções</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackupHistoryCsv}
                    disabled={backupHistory.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border border-border/70 transition text-xs font-semibold disabled:opacity-50 shadow-2xs cursor-pointer"
                    title="Exportar histórico como arquivo CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => activeConnection && refreshBackupHistory(activeConnection.id)}
                    disabled={isLoadingBackupHistory}
                    className="p-1.5 hover:text-foreground text-muted-foreground rounded-lg hover:bg-muted transition disabled:opacity-50 cursor-pointer"
                    title="Recarregar histórico"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isLoadingBackupHistory ? 'animate-spin text-primary' : ''}`} />
                  </button>
                </div>
              </div>

              {backupHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/20 border border-border/60 rounded-xl space-y-1">
                  <History className="w-8 h-8 mx-auto opacity-40 text-muted-foreground mb-2" />
                  <p className="font-semibold text-xs text-foreground">Nenhuma execução registrada</p>
                  <p className="text-[11px]">As rotinas manuais ou agendadas serão registradas aqui.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {backupHistory.map((h) => (
                    <div
                      key={h.id}
                      className={`p-3.5 bg-background/70 border rounded-xl gap-2 transition ${
                        h.success ? 'border-emerald-500/25 shadow-2xs' : 'border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs font-bold">
                          {h.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                          <span className="text-foreground">
                            {h.action === 'backup' ? 'Backup' : h.action === 'restore-drill' ? 'Restore Drill' : 'Restauração'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-muted border border-border/50 text-muted-foreground">
                            {h.trigger === 'scheduled' ? 'agendado' : 'manual'}
                          </span>
                        </span>

                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(h.startedAt).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1.5 truncate" title={h.message}>
                        {h.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground/80 mt-2 border-t border-border/40 pt-1.5">
                        {h.durationMs !== undefined && <span>Duração: {h.durationMs} ms</span>}
                        {h.sizeBytes !== undefined && <span>Tamanho: {formatBytes(h.sizeBytes)}</span>}
                        {h.checksumSha256 && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate" title={h.checksumSha256}>
                              SHA-256: {h.checksumSha256.slice(0, 16)}…
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCellToClipboard(h.checksumSha256!, `hist-hash-${h.id}`)}
                              className="hover:text-foreground transition underline font-mono text-[9px] cursor-pointer"
                              title="Copiar hash completo"
                            >
                              {copyFeedback === `hist-hash-${h.id}` ? '✓' : 'Copiar'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 5: WEBHOOKS */}
          {backupActiveTab === 'webhooks' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/70 rounded-xl">
                <div>
                  <span className="font-bold text-foreground text-xs">Webhooks de Notificação</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Disparados ao concluir backups, restaurações ou drills (manual ou agendado).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingWebhook({ method: 'POST', enabled: true })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo Webhook
                </button>
              </div>

              {backupWebhooks.length === 0 && !editingWebhook && (
                <div className="text-center py-10 text-muted-foreground bg-muted/20 border border-border/60 rounded-xl space-y-1">
                  <Webhook className="w-8 h-8 mx-auto opacity-40 text-muted-foreground mb-2" />
                  <p className="font-semibold text-xs text-foreground">Nenhum webhook configurado</p>
                  <p className="text-[11px]">Configure canais no Slack, Discord, Microsoft Teams ou HTTP genérico.</p>
                </div>
              )}

              <div className="space-y-2">
                {backupWebhooks.map((w) => (
                  <div key={w.id} className="p-3.5 bg-background/70 border border-border/70 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={w.enabled}
                              onChange={(e) => handleToggleWebhookEnabled(w, e.target.checked)}
                              className="text-primary focus:ring-0 rounded"
                            />
                          </label>
                          <span className="font-bold text-xs text-foreground truncate">{w.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted border border-border/60 text-muted-foreground shrink-0">
                            {w.method || 'POST'}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold shrink-0 ${
                              w.platform === 'slack'
                                ? 'bg-[#ecb22e]/10 text-[#ecb22e] border-[#ecb22e]/30'
                                : w.platform === 'discord'
                                ? 'bg-[#5865f2]/10 text-[#5865f2] border-[#5865f2]/30'
                                : w.platform === 'teams'
                                ? 'bg-[#6264a7]/10 text-[#6264a7] border-[#6264a7]/30'
                                : 'bg-muted text-muted-foreground border-border/60'
                            }`}
                          >
                            {w.platform || 'generic'}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate mt-1" title={w.endpointUrl}>
                          {w.endpointUrl}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestWebhook(w)}
                          disabled={isTestingWebhookId === w.id}
                          className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-xs font-semibold transition disabled:opacity-50 border border-border/60 shadow-2xs cursor-pointer"
                          title="Enviar payload de teste"
                        >
                          {isTestingWebhookId === w.id ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Testar'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingWebhook(w)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWebhook(w.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {webhookTestResults[w.id] && (
                      <div
                        className={`text-[10px] px-2.5 py-1.5 rounded-lg border ${
                          webhookTestResults[w.id].success
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {webhookTestResults[w.id].message}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {editingWebhook && (
                <form onSubmit={handleSaveWebhook} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {editingWebhook.id ? 'Editar Webhook' : 'Novo Webhook'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingWebhook(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-foreground">Nome</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Slack #backups-winthor"
                        value={editingWebhook.name || ''}
                        onChange={(e) => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground">Método</label>
                      <select
                        value={editingWebhook.method || 'POST'}
                        onChange={(e) => setEditingWebhook({ ...editingWebhook, method: e.target.value as 'POST' | 'PUT' })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-foreground">URL do Webhook</label>
                    <input
                      type="url"
                      required
                      placeholder="https://hooks.slack.com/services/..."
                      value={editingWebhook.endpointUrl || ''}
                      onChange={(e) => setEditingWebhook({ ...editingWebhook, endpointUrl: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-foreground">Plataforma</label>
                    <select
                      value={editingWebhook.platform || 'generic'}
                      onChange={(e) =>
                        setEditingWebhook({
                          ...editingWebhook,
                          platform: e.target.value as 'generic' | 'slack' | 'discord' | 'teams'
                        })
                      }
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="generic">Genérico (Payload JSON padrão)</option>
                      <option value="slack">Slack</option>
                      <option value="discord">Discord</option>
                      <option value="teams">Microsoft Teams</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground">Cabeçalho de Autenticação</label>
                      <input
                        type="text"
                        placeholder="Authorization (opcional)"
                        value={editingWebhook.authHeader || ''}
                        onChange={(e) => setEditingWebhook({ ...editingWebhook, authHeader: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-foreground">Valor do Token / Chave</label>
                      <input
                        type="password"
                        placeholder="Bearer ... (opcional)"
                        value={editingWebhook.authValue || ''}
                        onChange={(e) => setEditingWebhook({ ...editingWebhook, authValue: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-foreground">Disparar em:</span>
                    {(['success', 'failure'] as const).map((ev) => {
                      const checked = !editingWebhook.events || editingWebhook.events.includes(ev);
                      return (
                        <label key={ev} className="flex items-center gap-1.5 cursor-pointer text-muted-foreground select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const current = editingWebhook.events || ['success', 'failure'];
                              const updated = e.target.checked
                                ? Array.from(new Set([...current, ev]))
                                : current.filter((x) => x !== ev);
                              setEditingWebhook({ ...editingWebhook, events: updated as ('success' | 'failure')[] });
                            }}
                            className="text-primary focus:ring-0 rounded"
                          />
                          <span className="text-foreground">{ev === 'success' ? 'Sucesso' : 'Falha'}</span>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition text-xs shadow-xs cursor-pointer"
                  >
                    Salvar Webhook
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
