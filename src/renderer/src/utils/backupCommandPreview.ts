import type { DatabaseConnectionConfig, DatabaseType } from '../../../shared/types';
import { buildOracleConnectDescriptor } from '../../../shared/oracleCliConnect';

/** Template padrão de comando de backup por tipo de banco — sugestão inicial no editor de comando customizado. */
export function getDefaultBackupCommandTemplate(type: DatabaseType, compress = false): string {
  switch (type) {
    case 'oracle':
      return `expdp {user}/{password}@{connectString} directory={directory} dumpfile={fileName} logfile={logFileName} schemas={user}${compress ? ' compression=ALL' : ''}`;
    case 'mysql':
      // Sem shell não há "| gzip": o comando personalizado do MySQL grava o .sql sem compactar.
      return 'mysqldump -h {host} -P {port} -u {user} {database} --result-file="{filePath}"';
    default:
      return compress
        ? 'pg_dump -h {host} -p {port} -U {user} -d {database} -F c --no-password -f "{filePath}"'
        : 'pg_dump -h {host} -p {port} -U {user} -d {database} -F p --no-password --clean --if-exists -f "{filePath}"';
  }
}

export interface BackupCommandPreviewOptions {
  backupFolder: string;
  backupCompress: boolean;
  backupOracleDirectory: string;
  useCustomBackupCommand: boolean;
  customBackupCommand: string;
  /** Se falso (padrão), a senha aparece mascarada como '****' no preview. */
  showPassword: boolean;
}

type PreviewConnection = Pick<
  DatabaseConnectionConfig,
  'type' | 'host' | 'port' | 'database' | 'user' | 'password' | 'name' | 'oracleMode'
>;

/**
 * Monta o preview do comando de backup exibido em tempo real no modal: o comando padrão do
 * driver (pg_dump/expdp/mysqldump) quando não há comando customizado, ou o template customizado
 * com todos os placeholders substituídos por valores de exemplo — o timestamp real só existe no
 * momento da execução, então aparece como o literal "TIMESTAMP" no preview.
 *
 * Mesmo conjunto de placeholders (nome e ordem) usado por `BackupService.runCustomCommandBackup`
 * no processo main — se um novo placeholder for adicionado aqui, adicione lá também.
 */
export function resolveBackupCommandPreview(
  connection: PreviewConnection | null | undefined,
  options: BackupCommandPreviewOptions
): string {
  if (!connection) return '';
  const { backupFolder, backupCompress, backupOracleDirectory, useCustomBackupCommand, customBackupCommand, showPassword } = options;

  const defaultPort = connection.type === 'oracle' ? 1521 : connection.type === 'mysql' ? 3306 : 5432;
  const port = String(connection.port || defaultPort);
  const separator = connection.oracleMode === 'sid' ? ':' : '/';
  const connectString =
    connection.type === 'oracle'
      ? `${connection.host}:${port}${separator}${connection.database}`
      : `${connection.host}:${port}/${connection.database}`;
  const safeConnName = (connection.name || connection.database || connection.user || 'db').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDbName = (connection.database || connection.user || 'backup').replace(/[^a-zA-Z0-9_-]/g, '_');
  const defaultExt = connection.type === 'oracle' ? 'dmp' : connection.type === 'postgres' && backupCompress ? 'dump' : 'sql';
  const sampleFileName = `${safeConnName}_${safeDbName}_TIMESTAMP.${defaultExt}`;
  const sampleLogName = `${safeConnName}_${safeDbName}_TIMESTAMP.log`;
  const folder = backupFolder.trim() || 'C:\\Backups';
  const sampleFilePath = `${folder}\\${sampleFileName}`;
  const sampleLogPath = `${folder}\\${sampleLogName}`;
  const directory = backupOracleDirectory.trim() || 'DATA_PUMP_DIR';
  const pwdDisplay = showPassword ? connection.password || '' : '****';

  if (!useCustomBackupCommand) {
    // Mesmos nomes e argumentos que o BackupService usa no comando padrão de cada banco.
    if (connection.type === 'oracle') {
      const base = `${(connection.name || connection.user).replace(/[^a-zA-Z0-9_-]/g, '_')}_${connection.user}_TIMESTAMP`;
      // A conexão vai na variável LOCAL (TWO_TASK fora do Windows) e os parâmetros, com a senha,
      // num parfile temporário: só o parfile vai na linha de comando.
      return `LOCAL=${buildOracleConnectDescriptor({ ...connection, port })} expdp parfile=<temporário> → userid=${connection.user}/${pwdDisplay} directory=${directory} dumpfile=${base}.dmp logfile=${base}.log schemas=${connection.user}${backupCompress ? ' compression=ALL' : ''}`;
    }
    const base = `${(connection.name || connection.database).replace(/[^a-zA-Z0-9_-]/g, '_')}_${connection.database}_TIMESTAMP`;
    if (connection.type === 'mysql') {
      if (backupCompress) {
        return `mysqldump -h ${connection.host} -P ${port} -u ${connection.user} ${connection.database} | gzip > "${folder}\\${base}.sql.gz"`;
      }
      return `mysqldump -h ${connection.host} -P ${port} -u ${connection.user} --result-file="${folder}\\${base}.sql" ${connection.database}`;
    }
    const pgFile = `${folder}\\${base}.${backupCompress ? 'dump' : 'sql'}`;
    return `pg_dump -h ${connection.host} -p ${port} -U ${connection.user} -d ${connection.database} -f "${pgFile}" -F ${backupCompress ? 'c' : 'p'} --no-password${backupCompress ? '' : ' --clean --if-exists'}`;
  }

  let cmd = customBackupCommand || '';
  cmd = cmd.split('{user}').join(connection.user || '');
  cmd = cmd.split('{password}').join(pwdDisplay);
  cmd = cmd.split('{host}').join(connection.host || '');
  cmd = cmd.split('{port}').join(port);
  cmd = cmd.split('{database}').join(connection.database || '');
  cmd = cmd.split('{connectString}').join(connectString);
  cmd = cmd.split('{directory}').join(directory);
  cmd = cmd.split('{folder}').join(folder);
  cmd = cmd.split('{fileName}').join(sampleFileName);
  cmd = cmd.split('{filePath}').join(sampleFilePath);
  cmd = cmd.split('{logFileName}').join(sampleLogName);
  cmd = cmd.split('{logPath}').join(sampleLogPath);
  cmd = cmd.split('{timestamp}').join('TIMESTAMP');
  return cmd;
}
