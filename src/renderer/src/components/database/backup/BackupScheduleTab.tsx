import React from 'react';
import { CalendarClock, SlidersHorizontal, FlaskConical } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import type { BackupFormState } from '../../../hooks/database/useBackupForm';
import { BACKUP_CRON_PRESETS, DRILL_CRON_PRESETS, backupResultToneClass } from '../../../utils/backupModalUtils';

interface BackupScheduleTabProps {
  connections: DatabaseConnectionConfig[];
  form: BackupFormState;
  isSavingSchedule: boolean;
  scheduleSaveResult: { success: boolean; message: string } | null;
  onSave: () => void;
}

export const BackupScheduleTab: React.FC<BackupScheduleTabProps> = ({
  connections,
  form,
  isSavingSchedule,
  scheduleSaveResult,
  onSave
}) => {
  const {
    backupCron,
    setBackupCron,
    backupScheduleEnabled,
    setBackupScheduleEnabled,
    backupRetentionCount,
    setBackupRetentionCount,
    backupRetentionDays,
    setBackupRetentionDays,
    drillCron,
    setDrillCron,
    drillScheduleEnabled,
    setDrillScheduleEnabled,
    drillScratchConnectionId,
    setDrillScratchConnectionId,
    backupFolder
  } = form;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-3">
        <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-primary" /> Frequência de Execução Automática (Cron)
        </span>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={backupCron}
            onChange={(e) => setBackupCron(e.target.value)}
            className="flex-1 bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
          >
            <option value="">Sem agendamento (somente manual)</option>
            <option value="0 * * * *">A cada hora (0 * * * *)</option>
            <option value="0 */6 * * *">A cada 6 horas (0 */6 * * *)</option>
            <option value="0 2 * * *">Diário às 02:00 (0 2 * * *)</option>
            <option value="0 2 * * 0">Semanal (domingo às 02:00)</option>
            {backupCron && !BACKUP_CRON_PRESETS.includes(backupCron) && (
              <option value={backupCron}>Personalizado: {backupCron}</option>
            )}
          </select>
          <input
            type="text"
            value={backupCron}
            onChange={(e) => setBackupCron(e.target.value)}
            placeholder="cron: 0 2 * * *"
            className="w-full sm:w-44 bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
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
        <p className="text-2xs text-muted-foreground">
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
                className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
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
                className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
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
        <p className="text-2xs text-muted-foreground">
          Restaura automaticamente o backup mais recente gerado contra uma base de teste descartável (scratch) para certificar a integridade dos dados.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 flex items-center gap-2">
            <select
              value={drillCron}
              onChange={(e) => setDrillCron(e.target.value)}
              className="flex-1 bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
            >
              <option value="">Sem drill agendado</option>
              <option value="0 4 * * *">Diário às 04:00</option>
              <option value="0 4 * * 0">Semanal (domingo às 04:00)</option>
              {drillCron && !DRILL_CRON_PRESETS.includes(drillCron) && (
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
              className="w-full bg-background border border-border/80 rounded-lg p-2 text-foreground focus:outline-hidden focus:border-primary text-xs"
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
        onClick={onSave}
        disabled={isSavingSchedule || !backupFolder.trim()}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-md hover:bg-primary/90 transition disabled:opacity-50 text-xs cursor-pointer"
      >
        <CalendarClock className={`w-4 h-4 ${isSavingSchedule ? 'animate-spin' : ''}`} />
        <span>{isSavingSchedule ? 'Salvando Configurações...' : 'Salvar Configurações de Agendamento'}</span>
      </button>

      {scheduleSaveResult && (
        <div className={`p-3 rounded-xl border text-xs ${backupResultToneClass(scheduleSaveResult.success)}`}>
          {scheduleSaveResult.message}
        </div>
      )}
    </div>
  );
};
