import type {
  BackupConfig,
  BackupHistoryEntry,
  BackupWebhookConfig,
  DatabaseType
} from '../../../shared/types';

export const BACKUP_CRON_PRESETS = ['0 * * * *', '0 */6 * * *', '0 2 * * *', '0 2 * * 0'];
export const DRILL_CRON_PRESETS = ['0 4 * * *', '0 4 * * 0'];

export type BackupWebhookEvent = 'success' | 'failure';

export const BACKUP_TONE_SUCCESS = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300';
export const BACKUP_TONE_FAILURE = 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300';

export function backupResultToneClass(success: boolean): string {
  return success ? BACKUP_TONE_SUCCESS : BACKUP_TONE_FAILURE;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getDefaultDbPort(type: DatabaseType): number {
  return type === 'oracle' ? 1521 : type === 'mysql' ? 3306 : 5432;
}

/** Comando customizado só pode rodar se referenciar o arquivo de saída. */
export function hasBackupFileTag(command: string): boolean {
  return command.includes('{filePath}') || command.includes('{fileName}');
}

export interface BackupCommandPreset {
  label: string;
  command: string;
  title?: string;
}

export function getBackupCommandPresets(type: DatabaseType): BackupCommandPreset[] {
  if (type === 'oracle') {
    return [
      {
        label: 'expdp (Padrão)',
        command: 'expdp {user}@{connectString} directory={directory} dumpfile={fileName} logfile={logFileName} schemas={user}'
      },
      {
        label: 'expdp (Compatível 11g + Sem Estatísticas)',
        command:
          'expdp {user}@{connectString} directory={directory} dumpfile={fileName} logfile={logFileName} schemas={user} version=11.2 exclude=statistics',
        title: 'Compatível com Oracle 11g e desabilita estatísticas para acelerar'
      },
      {
        label: 'exp (Export Clássico / Local)',
        command:
          'exp {user}/{password}@{connectString} file="{filePath}" log="{logPath}" owner={user} buffer=65536 direct=y consistent=y statistics=none',
        title: 'Export clássico direto no disco do cliente (sem depender do DATA_PUMP_DIR do servidor)'
      }
    ];
  }
  if (type === 'mysql') {
    return [
      {
        label: 'mysqldump (Padrão)',
        command: 'mysqldump -h {host} -P {port} -u {user} {database} --result-file="{filePath}"'
      },
      {
        label: 'mysqldump (Transacional)',
        command:
          'mysqldump -h {host} -P {port} -u {user} --single-transaction --quick {database} --result-file="{filePath}"'
      }
    ];
  }
  return [
    {
      label: 'pg_dump (-Fc Custom Binário)',
      command: 'pg_dump -h {host} -p {port} -U {user} -d {database} -F c -b -v -f "{filePath}"'
    },
    {
      label: 'pg_dump (Plain SQL)',
      command: 'pg_dump -h {host} -p {port} -U {user} -d {database} -F p -f "{filePath}"'
    }
  ];
}

export interface BackupFileTagInfo {
  tag: string;
  req: boolean;
  tip: string;
}

export const BACKUP_FILE_TAGS: BackupFileTagInfo[] = [
  { tag: '{filePath}', req: true, tip: 'Caminho completo do arquivo gerado' },
  { tag: '{fileName}', req: true, tip: 'Nome simples do arquivo de dump' },
  { tag: '{folder}', req: false, tip: 'Diretório de destino selecionado' }
];
export const BACKUP_CONNECTION_TAGS = ['{user}', '{password}', '{connectString}', '{host}', '{port}', '{database}'];
export const BACKUP_UTILITY_TAGS = ['{directory}', '{logPath}', '{timestamp}'];

/** Acrescenta uma tag ao fim do comando, separando por espaço quando já há conteúdo. */
export function appendCommandTag(prev: string, tag: string): string {
  return prev ? `${prev} ${tag}` : tag;
}

const CSV_HEADER = ['startedAt', 'action', 'trigger', 'success', 'message', 'filePath', 'sizeBytes', 'durationMs', 'checksumSha256'];

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildBackupHistoryCsv(history: BackupHistoryEntry[]): string {
  const rows = history.map((h) =>
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
  return [CSV_HEADER.join(','), ...rows].join('\r\n');
}

export function buildBackupHistoryCsvFilename(connectionName: string | undefined, now: Date): string {
  const connName = (connectionName || 'conexao').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `backup-history_${connName}_${now.toISOString().slice(0, 10)}.csv`;
}

export function getBackupHistoryActionLabel(action: BackupHistoryEntry['action']): string {
  return action === 'backup' ? 'Backup' : action === 'restore-drill' ? 'Restore Drill' : 'Restauração';
}

/** Substitui (e move para o início) a config da conexão na lista existente. */
export function upsertBackupConfig(existing: BackupConfig[], entry: BackupConfig): BackupConfig[] {
  return [entry, ...existing.filter((b) => b.connectionId !== entry.connectionId)];
}

export function parseOptionalNumber(value: string): number | undefined {
  return value.trim() ? Number(value.trim()) : undefined;
}

/** Normaliza o webhook em edição para o formato persistido. */
export function normalizeWebhook(editing: Partial<BackupWebhookConfig>, nowMs: number): BackupWebhookConfig {
  return {
    id: editing.id || `webhook_${nowMs}`,
    name: (editing.name || '').trim(),
    endpointUrl: (editing.endpointUrl || '').trim(),
    method: editing.method || 'POST',
    authHeader: editing.authHeader?.trim() || undefined,
    authValue: editing.authValue?.trim() || undefined,
    enabled: editing.enabled !== undefined ? editing.enabled : true,
    events: editing.events && editing.events.length > 0 ? editing.events : undefined,
    platform: editing.platform || 'generic'
  };
}

export function upsertWebhook(
  list: BackupWebhookConfig[],
  webhook: BackupWebhookConfig,
  isEditing: boolean
): BackupWebhookConfig[] {
  return isEditing ? list.map((w) => (w.id === webhook.id ? webhook : w)) : [...list, webhook];
}

export function toggleWebhookEvent(
  events: BackupWebhookEvent[] | undefined,
  ev: BackupWebhookEvent,
  checked: boolean
): BackupWebhookEvent[] {
  const current = events || ['success', 'failure'];
  return checked ? Array.from(new Set([...current, ev])) : current.filter((x) => x !== ev);
}

export function webhookPlatformBadgeClass(platform: BackupWebhookConfig['platform']): string {
  switch (platform) {
    case 'slack':
      return 'bg-[#ecb22e]/10 text-[#ecb22e] border-[#ecb22e]/30';
    case 'discord':
      return 'bg-[#5865f2]/10 text-[#5865f2] border-[#5865f2]/30';
    case 'teams':
      return 'bg-[#6264a7]/10 text-[#6264a7] border-[#6264a7]/30';
    default:
      return 'bg-muted text-muted-foreground border-border/60';
  }
}
