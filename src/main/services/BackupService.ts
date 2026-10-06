import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream';
import crypto from 'crypto';
import { execFile, spawn } from 'child_process';
import { DatabaseConnectionConfig, BackupResult, BackupFileInfo } from '../../shared/types';
import { isSafeLocalPath, isValidIdentifier } from '../utils/security';
import type { ConfigService } from './ConfigService';

/** Tempo máximo de um dump/restore MySQL via spawn (os execFile dos demais bancos já têm timeout). */
const SPAWN_TIMEOUT_MS = 20 * 60 * 1000;

/** Margem mínima de espaço livre exigida na pasta de destino antes de iniciar um backup local. */
const MIN_FREE_DISK_BYTES = 200 * 1024 * 1024;

export interface BackupOptions {
  pgDumpPath?: string;
  expdpPath?: string;
  mysqldumpPath?: string;
  psqlPath?: string;
  impdpPath?: string;
  mysqlPath?: string;
  /** Caminho do executável pg_restore, usado quando o backup foi gerado em formato compactado (-Fc). */
  pgRestorePath?: string;
  /** Nome do objeto DIRECTORY do Oracle (ex: DATA_PUMP_DIR) cujo caminho no servidor deve
   * corresponder a destinationFolder (expdp/impdp gravam/leem no servidor, não no cliente). */
  oracleDirectory?: string;
  /** Gera o backup em formato compactado (pg_dump -Fc / mysqldump+gzip / expdp compression=ALL). */
  compress?: boolean;
  /** Se o backup desta conexão deve executar via comando customizado em vez do comando padrão. */
  useCustomCommand?: boolean;
  /** Template do comando customizado a ser executado para esta conexão (requer placeholder {filePath}). */
  customCommand?: string;
}

export interface BackupPlaceholders {
  user: string;
  password?: string;
  host: string;
  port: string;
  database: string;
  connectString: string;
  directory: string;
  folder: string;
  fileName: string;
  filePath: string;
  logFileName: string;
  logPath: string;
  timestamp: string;
}

/**
 * Constrói o mapa de placeholders disponíveis para substituição em comandos de backup.
 */
export function buildBackupPlaceholders(
  config: DatabaseConnectionConfig,
  destinationFolder: string,
  options?: BackupOptions
): BackupPlaceholders {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeConnName = (config.name || config.database || config.user || 'db').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDbName = (config.database || config.user || 'backup').replace(/[^a-zA-Z0-9_-]/g, '_');

  let defaultExt = 'sql';
  if (config.type === 'oracle') {
    defaultExt = 'dmp';
  } else if (config.type === 'postgres' && options?.compress) {
    defaultExt = 'dump';
  }

  const fileName = `${safeConnName}_${safeDbName}_${timestamp}.${defaultExt}`;
  const logFileName = `${safeConnName}_${safeDbName}_${timestamp}.log`;
  const filePath = path.join(destinationFolder, fileName);
  const logPath = path.join(destinationFolder, logFileName);

  const defaultPort = config.type === 'oracle' ? 1521 : config.type === 'mysql' ? 3306 : 5432;
  const port = String(config.port || defaultPort);

  const separator = config.oracleMode === 'sid' ? ':' : '/';
  const connectString =
    config.type === 'oracle'
      ? `${config.host}:${port}${separator}${config.database}`
      : `${config.host}:${port}/${config.database}`;

  const directory = (options?.oracleDirectory && options.oracleDirectory.trim()) || 'DATA_PUMP_DIR';

  return {
    user: config.user || '',
    password: config.password || '',
    host: config.host || '',
    port,
    database: config.database || '',
    connectString,
    directory,
    folder: destinationFolder,
    fileName,
    filePath,
    logFileName,
    logPath,
    timestamp
  };
}

/**
 * Substitui os marcadores {variavel} no template pelos valores calculados.
 */
export function interpolateBackupTemplate(
  template: string,
  placeholders: BackupPlaceholders
): string {
  let result = template;
  const map: Record<string, string> = {
    '{user}': placeholders.user,
    '{password}': placeholders.password || '',
    '{host}': placeholders.host,
    '{port}': placeholders.port,
    '{database}': placeholders.database,
    '{connectString}': placeholders.connectString,
    '{directory}': placeholders.directory,
    '{folder}': placeholders.folder,
    '{fileName}': placeholders.fileName,
    '{filePath}': placeholders.filePath,
    '{logFileName}': placeholders.logFileName,
    '{logPath}': placeholders.logPath,
    '{timestamp}': placeholders.timestamp
  };

  for (const [key, val] of Object.entries(map)) {
    result = result.split(key).join(val);
  }
  return result;
}

/**
 * Tokeniza uma linha de comando em array de argumentos respeitando aspas simples e duplas,
 * sem invocar interpretador de shell (execFile seguro).
 */
export function parseCommandLineTokens(cmd: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      if (i + 1 < cmd.length && (cmd[i + 1] === '"' || cmd[i + 1] === '\\')) {
        escaped = true;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Monta o argv do comando customizado. O template é tokenizado ANTES de receber os valores,
 * então um host, senha ou caminho com espaço/aspas continua sendo um único argumento
 * (interpolar primeiro e tokenizar depois deixava o valor injetar argumentos).
 */
export function buildCustomCommandArgv(template: string, placeholders: BackupPlaceholders): string[] {
  return parseCommandLineTokens(template).map((token) => interpolateBackupTemplate(token, placeholders));
}

/**
 * Mascara qualquer ocorrência da senha com asteriscos.
 */
export function maskSensitiveText(text: string, sensitive?: string): string {
  if (!sensitive || !sensitive.trim()) return text;
  return text.split(sensitive).join('****');
}

export class BackupService {
  constructor(private configService?: ConfigService) {}

  /**
   * Resolve a senha da conexão caso tenha vindo em branco/sanitizada, buscando nas
   * configurações salvas em memória através do id da conexão ou da tupla (host, port, user, database).
   */
  public resolveConnectionConfig(config: DatabaseConnectionConfig): DatabaseConnectionConfig {
    if (config.password || !this.configService) {
      return config;
    }
    const settings = this.configService.getSettings();
    const saved = settings.databaseConnections?.find(
      (c) =>
        (config.id && c.id === config.id) ||
        (c.host === config.host &&
          c.port === config.port &&
          c.user === config.user &&
          c.database === config.database)
    );
    if (saved?.password) {
      return { ...config, password: saved.password };
    }
    return config;
  }

  /** Conexões com backup ou restauração em andamento, para impedir execuções concorrentes na mesma conexão. */
  private busyConnections = new Set<string>();

  /**
   * Executa um backup lógico da conexão informada, salvando o arquivo em destinationFolder.
   * Suporta PostgreSQL (pg_dump), Oracle (expdp), MySQL (mysqldump) ou comando personalizado.
   */
  public async runBackup(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    options?: BackupOptions
  ): Promise<BackupResult> {
    config = this.resolveConnectionConfig(config);
    if (!isSafeLocalPath(destinationFolder)) {
      return { success: false, message: 'Pasta de destino inválida.' };
    }

    if (!this.acquireLock(config.id)) {
      return { success: false, message: 'Já existe um backup ou restauração em andamento para esta conexão.' };
    }

    try {
      let result: BackupResult;
      const shouldUseCustom = !!options?.useCustomCommand && !!options?.customCommand?.trim();

      if (shouldUseCustom) {
        result = await this.runCustomCommandBackupInternal(config, destinationFolder, options!.customCommand!.trim(), options);
      } else {
        switch (config.type) {
          case 'postgres':
            result = await this.backupPostgres(config, destinationFolder, options?.pgDumpPath, options?.compress);
            break;
          case 'oracle':
            result = await this.backupOracle(config, destinationFolder, options?.expdpPath, options?.oracleDirectory, options?.compress);
            break;
          case 'mysql':
            result = await this.backupMysql(config, destinationFolder, options?.mysqldumpPath, options?.compress);
            break;
          default:
            return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado para backup.` };
        }
      }

      if (result.success && result.filePath) {
        result.checksumSha256 = await this.computeChecksum(result.filePath).catch(() => undefined);
      }
      return result;
    } finally {
      this.releaseLock(config.id);
    }
  }

  /**
   * Executa um backup com comando customizado diretamente, com controle de lock.
   */
  public async runCustomCommandBackup(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    customCommandTemplate: string,
    options?: BackupOptions
  ): Promise<BackupResult> {
    config = this.resolveConnectionConfig(config);
    if (!isSafeLocalPath(destinationFolder)) {
      return { success: false, message: 'Pasta de destino inválida.' };
    }

    if (!this.acquireLock(config.id)) {
      return { success: false, message: 'Já existe um backup ou restauração em andamento para esta conexão.' };
    }

    try {
      const result = await this.runCustomCommandBackupInternal(config, destinationFolder, customCommandTemplate, options);
      if (result.success && result.filePath) {
        result.checksumSha256 = await this.computeChecksum(result.filePath).catch(() => undefined);
      }
      return result;
    } finally {
      this.releaseLock(config.id);
    }
  }

  /**
   * Núcleo de execução do comando customizado (pressupõe lock já adquirido).
   * Não utiliza interpretador de shell; faz parse seguro em tokens e executa via execFile.
   */
  public async runCustomCommandBackupInternal(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    customCommandTemplate: string,
    options?: BackupOptions
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!customCommandTemplate || !customCommandTemplate.trim()) {
      return { success: false, message: 'O comando de backup personalizado não pode estar em branco.' };
    }

    if (!customCommandTemplate.includes('{filePath}') && !customCommandTemplate.includes('{fileName}')) {
      return {
        success: false,
        message: 'O comando personalizado deve conter obrigatoriamente a tag {filePath} (ou {fileName}) para identificar o arquivo de backup gerado.'
      };
    }

    // Bloqueia metacaracteres perigosos de encadeamento/redirecionamento de shell
    if (/[\0\r\n;&|<>`]/.test(customCommandTemplate)) {
      return {
        success: false,
        message: 'O comando contém caracteres não permitidos (; & | < > ` ou quebras de linha).'
      };
    }

    try {
      await fs.promises.mkdir(destinationFolder, { recursive: true });
    } catch (err: any) {
      return { success: false, message: `Não foi possível criar/acessar a pasta de destino: ${err.message}` };
    }

    const diskWarning = await this.checkDiskSpace(destinationFolder);
    if (diskWarning) return { success: false, message: diskWarning };

    const placeholders = buildBackupPlaceholders(config, destinationFolder, options);

    // Valida que nenhum placeholder resolvido contenha \0 ou quebra de linha
    for (const [key, val] of Object.entries(placeholders)) {
      if (typeof val === 'string' && /[\0\r\n]/.test(val)) {
        return { success: false, message: `Valor inválido no parâmetro ${key}: quebra de linha ou caractere nulo.` };
      }
    }

    const tokens = buildCustomCommandArgv(customCommandTemplate, placeholders);

    if (tokens.length === 0) {
      return { success: false, message: 'Comando personalizado vazio após processamento.' };
    }

    const binary = tokens[0];
    const args = tokens.slice(1);
    const targetFilePath = placeholders.filePath;

    return new Promise<BackupResult>((resolve) => {
      execFile(
        binary,
        args,
        {
          env: {
            ...process.env,
            PGPASSWORD: config.password || '',
            MYSQL_PWD: config.password || ''
          },
          maxBuffer: 20 * 1024 * 1024,
          timeout: 20 * 60 * 1000
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const maskedStderr = maskSensitiveText(stderr || '', config.password);
          const maskedStdout = maskSensitiveText(stdout || '', config.password);

          if (error) {
            const maskedErrMessage = maskSensitiveText(error.message || '', config.password);
            const detail = maskedStderr.trim() || maskedStdout.trim() || maskedErrMessage;
            resolve({
              success: false,
              message: `Falha ao executar comando personalizado (${path.basename(binary)}): ${detail}`,
              durationMs
            });
            return;
          }

          fs.promises
            .stat(targetFilePath)
            .then((stat) => {
              resolve({
                success: true,
                message: `Backup gerado com sucesso via comando personalizado em ${targetFilePath}`,
                filePath: targetFilePath,
                sizeBytes: stat.size,
                durationMs
              });
            })
            .catch(() => {
              const isExpdp = path.basename(binary).toLowerCase().includes('expdp');
              if (isExpdp) {
                resolve({
                  success: true,
                  message: `Comando expdp concluído com sucesso, mas o arquivo não foi encontrado localmente em ${targetFilePath}. Se o Oracle estiver em servidor remoto, o dump foi gravado no diretório do servidor.`,
                  durationMs
                });
              } else {
                resolve({
                  success: false,
                  message: `Comando executado com código 0, mas o arquivo de backup esperado não foi encontrado em: ${targetFilePath}`,
                  durationMs
                });
              }
            });
        }
      );
    });
  }

  /**
   * Executa uma restauração de teste ("drill") de um backup contra uma conexão separada
   * ("scratch") escolhida pelo usuário, para validar que o arquivo gerado é restaurável sem
   * mexer no banco de origem. Reusa restoreBackup como está — cabe ao usuário garantir que a
   * conexão informada é realmente descartável, o serviço não tenta provisionar nada sozinho.
   */
  public async runRestoreDrill(
    scratchConfig: DatabaseConnectionConfig,
    filePath: string,
    options?: BackupOptions
  ): Promise<BackupResult> {
    scratchConfig = this.resolveConnectionConfig(scratchConfig);
    const result = await this.restoreBackup(scratchConfig, filePath, options);
    if (result.success) {
      result.checksumSha256 = await this.computeChecksum(filePath).catch(() => undefined);
    }
    return result;
  }

  /** Calcula o SHA-256 de um arquivo via streaming, sem carregá-lo inteiro em memória. */
  private computeChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Restaura um backup previamente gerado (filePath) na conexão informada.
   * Operação destrutiva: pode sobrescrever/duplicar dados já existentes no banco de destino.
   */
  public async restoreBackup(
    config: DatabaseConnectionConfig,
    filePath: string,
    options?: BackupOptions
  ): Promise<BackupResult> {
    config = this.resolveConnectionConfig(config);
    if (!isSafeLocalPath(filePath) || !fs.existsSync(filePath)) {
      return { success: false, message: 'Arquivo de backup não encontrado.' };
    }

    if (!this.acquireLock(config.id)) {
      return { success: false, message: 'Já existe um backup ou restauração em andamento para esta conexão.' };
    }

    try {
      switch (config.type) {
        case 'postgres':
          return await this.restorePostgres(config, filePath, options?.psqlPath, options?.pgRestorePath);
        case 'oracle':
          return await this.restoreOracle(config, filePath, options?.impdpPath, options?.oracleDirectory);
        case 'mysql':
          return await this.restoreMysql(config, filePath, options?.mysqlPath);
        default:
          return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado para restauração.` };
      }
    } finally {
      this.releaseLock(config.id);
    }
  }

  private acquireLock(connectionId: string | undefined): boolean {
    const key = connectionId || '__unknown__';
    if (this.busyConnections.has(key)) return false;
    this.busyConnections.add(key);
    return true;
  }

  private releaseLock(connectionId: string | undefined): void {
    this.busyConnections.delete(connectionId || '__unknown__');
  }

  /**
   * Verifica se a pasta de destino tem espaço livre suficiente antes de iniciar um dump local.
   * fs.statfs não existe em todas as plataformas/versões de Node — nesse caso a checagem é ignorada
   * silenciosamente (retorna null) em vez de bloquear o backup.
   */
  private async checkDiskSpace(destinationFolder: string): Promise<string | null> {
    try {
      const stat = await fs.promises.statfs(destinationFolder);
      const freeBytes = stat.bsize * stat.bavail;
      if (freeBytes < MIN_FREE_DISK_BYTES) {
        return `Espaço em disco insuficiente em ${destinationFolder}: apenas ${(freeBytes / (1024 * 1024)).toFixed(0)} MB livres.`;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Lista os arquivos de backup (.sql / .dump / .dmp) já existentes em uma pasta, mais recentes primeiro.
   */
  public async listBackups(destinationFolder: string): Promise<BackupFileInfo[]> {
    if (!isSafeLocalPath(destinationFolder) || !fs.existsSync(destinationFolder)) return [];

    const entries = await fs.promises.readdir(destinationFolder, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile() && /\.(sql(\.gz)?|dump|dmp)$/i.test(e.name));

    const infos: BackupFileInfo[] = [];
    for (const file of files) {
      const filePath = path.join(destinationFolder, file.name);
      try {
        const stat = await fs.promises.stat(filePath);
        infos.push({
          fileName: file.name,
          filePath,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString()
        });
      } catch {
        // Ignora arquivos que sumiram entre o readdir e o stat
      }
    }

    return infos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Apaga backups antigos da pasta: mantém só os `retentionCount` mais recentes (quando informado)
   * e/ou remove qualquer backup com mais de `retentionDays` dias (quando informado). Os dois critérios
   * são independentes — um arquivo é apagado se violar qualquer um deles.
   */
  public async applyRetention(destinationFolder: string, retentionCount?: number, retentionDays?: number): Promise<number> {
    if (!retentionCount && !retentionDays) return 0;

    const files = await this.listBackups(destinationFolder);
    const maxAgeMs = retentionDays && retentionDays > 0 ? retentionDays * 24 * 60 * 60 * 1000 : undefined;
    const now = Date.now();

    const toDelete = files.filter((file, index) => {
      const overCount = !!retentionCount && retentionCount > 0 && index >= retentionCount;
      const overAge = !!maxAgeMs && now - new Date(file.createdAt).getTime() > maxAgeMs;
      return overCount || overAge;
    });

    let deleted = 0;
    for (const file of toDelete) {
      try {
        await fs.promises.unlink(file.filePath);
        deleted++;
      } catch {
        // Ignora falha ao remover um backup antigo específico
      }
    }
    return deleted;
  }

  private async backupPostgres(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    pgDumpPath?: string,
    compress?: boolean
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!config.database || !isValidIdentifier(config.database)) {
      return { success: false, message: 'Nome do banco de dados inválido ou ausente na conexão.' };
    }

    try {
      await fs.promises.mkdir(destinationFolder, { recursive: true });
    } catch (err: any) {
      return { success: false, message: `Não foi possível criar/acessar a pasta de destino: ${err.message}` };
    }

    const diskWarning = await this.checkDiskSpace(destinationFolder);
    if (diskWarning) return { success: false, message: diskWarning };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeConnName = (config.name || config.database).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeConnName}_${config.database}_${timestamp}.${compress ? 'dump' : 'sql'}`;
    const filePath = path.join(destinationFolder, fileName);

    const binary = pgDumpPath && pgDumpPath.trim() ? pgDumpPath.trim() : 'pg_dump';
    const args = [
      '-h', config.host,
      '-p', String(config.port || 5432),
      '-U', config.user,
      '-d', config.database,
      '-f', filePath,
      '-F', compress ? 'c' : 'p',
      '--no-password'
    ];

    return new Promise<BackupResult>((resolve) => {
      execFile(
        binary,
        args,
        {
          env: { ...process.env, PGPASSWORD: config.password || '' },
          maxBuffer: 20 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        },
        (error, _stdout, stderr) => {
          const durationMs = Date.now() - startTime;

          if (error) {
            fs.promises.unlink(filePath).catch(() => {});
            resolve({
              success: false,
              message: this.formatPostgresCliError('pg_dump', error, stderr),
              durationMs
            });
            return;
          }

          fs.promises
            .stat(filePath)
            .then((stat) => {
              resolve({
                success: true,
                message: `Backup gerado com sucesso em ${filePath}`,
                filePath,
                sizeBytes: stat.size,
                durationMs
              });
            })
            .catch(() => {
              resolve({
                success: true,
                message: `Backup gerado com sucesso em ${filePath}`,
                filePath,
                durationMs
              });
            });
        }
      );
    });
  }

  /**
   * Restaura um backup do PostgreSQL. Dumps plain-SQL (.sql) usam psql -f; dumps em formato
   * custom (.dump, gerados com compress=true) usam pg_restore --clean --if-exists, que já
   * remove os objetos existentes antes de recriá-los.
   */
  private async restorePostgres(
    config: DatabaseConnectionConfig,
    filePath: string,
    psqlPath?: string,
    pgRestorePath?: string
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!config.database || !isValidIdentifier(config.database)) {
      return { success: false, message: 'Nome do banco de dados inválido ou ausente na conexão.' };
    }

    // Backups gerados com compress=true usam formato custom (-Fc) e exigem pg_restore, não psql -f.
    const isCustomFormat = /\.dump$/i.test(filePath);
    const binary = isCustomFormat
      ? (pgRestorePath && pgRestorePath.trim() ? pgRestorePath.trim() : 'pg_restore')
      : (psqlPath && psqlPath.trim() ? psqlPath.trim() : 'psql');
    const args = isCustomFormat
      ? [
          '-h', config.host,
          '-p', String(config.port || 5432),
          '-U', config.user,
          '-d', config.database,
          '--no-password',
          '--clean',
          '--if-exists',
          filePath
        ]
      : [
          '-h', config.host,
          '-p', String(config.port || 5432),
          '-U', config.user,
          '-d', config.database,
          '-f', filePath,
          '-v', 'ON_ERROR_STOP=1'
        ];

    return new Promise<BackupResult>((resolve) => {
      execFile(
        binary,
        args,
        {
          env: { ...process.env, PGPASSWORD: config.password || '' },
          maxBuffer: 20 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        },
        (error, _stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          if (error) {
            resolve({ success: false, message: this.formatPostgresCliError(binary, error, stderr), durationMs });
            return;
          }
          resolve({ success: true, message: `Restauração concluída a partir de ${filePath}`, durationMs });
        }
      );
    });
  }

  private async backupMysql(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    mysqldumpPath?: string,
    compress?: boolean
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!config.database || !isValidIdentifier(config.database)) {
      return { success: false, message: 'Nome do banco de dados inválido ou ausente na conexão.' };
    }

    try {
      await fs.promises.mkdir(destinationFolder, { recursive: true });
    } catch (err: any) {
      return { success: false, message: `Não foi possível criar/acessar a pasta de destino: ${err.message}` };
    }

    const diskWarning = await this.checkDiskSpace(destinationFolder);
    if (diskWarning) return { success: false, message: diskWarning };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeConnName = (config.name || config.database).replace(/[^a-zA-Z0-9_-]/g, '_');
    const binary = mysqldumpPath && mysqldumpPath.trim() ? mysqldumpPath.trim() : 'mysqldump';

    if (!compress) {
      const fileName = `${safeConnName}_${config.database}_${timestamp}.sql`;
      const filePath = path.join(destinationFolder, fileName);
      const args = [
        '-h', config.host,
        '-P', String(config.port || 3306),
        '-u', config.user,
        `--result-file=${filePath}`,
        config.database
      ];

      return new Promise<BackupResult>((resolve) => {
        execFile(
          binary,
          args,
          {
            // MYSQL_PWD evita expor a senha nos argumentos do processo (visível em listas de processos)
            env: { ...process.env, MYSQL_PWD: config.password || '' },
            maxBuffer: 20 * 1024 * 1024,
            timeout: 10 * 60 * 1000
          },
          (error, _stdout, stderr) => {
            const durationMs = Date.now() - startTime;

            if (error) {
              fs.promises.unlink(filePath).catch(() => {});
              resolve({
                success: false,
                message: this.formatMysqlCliError('mysqldump', error, stderr),
                durationMs
              });
              return;
            }

            fs.promises
              .stat(filePath)
              .then((stat) => {
                resolve({
                  success: true,
                  message: `Backup gerado com sucesso em ${filePath}`,
                  filePath,
                  sizeBytes: stat.size,
                  durationMs
                });
              })
              .catch(() => {
                resolve({
                  success: true,
                  message: `Backup gerado com sucesso em ${filePath}`,
                  filePath,
                  durationMs
                });
              });
          }
        );
      });
    }

    // compress=true: mysqldump não tem flag de compactação própria no CLI padrão, então o
    // stdout é streamado através de gzip diretamente para o arquivo final (.sql.gz).
    const fileName = `${safeConnName}_${config.database}_${timestamp}.sql.gz`;
    const filePath = path.join(destinationFolder, fileName);
    const args = ['-h', config.host, '-P', String(config.port || 3306), '-u', config.user, config.database];

    return new Promise<BackupResult>((resolve) => {
      const child = spawn(binary, args, {
        env: { ...process.env, MYSQL_PWD: config.password || '' }
      });

      let stderr = '';
      let settled = false;
      const timer = setTimeout(() => {
        child.kill();
        fs.promises.unlink(filePath).catch(() => {});
        finish({ success: false, message: 'mysqldump excedeu o tempo limite e foi encerrado.', durationMs: Date.now() - startTime });
      }, SPAWN_TIMEOUT_MS);
      const finish = (result: BackupResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err: any) => {
        const durationMs = Date.now() - startTime;
        fs.promises.unlink(filePath).catch(() => {});
        finish({ success: false, message: this.formatMysqlCliError('mysqldump', err, stderr), durationMs });
      });

      // O resultado só sai quando o processo fechou E o arquivo terminou de ser gravado: antes, o
      // 'close' do processo podia chegar antes do fim do gzip e o stat media um arquivo incompleto.
      let closeCode: number | null | undefined;
      let writeDone = false;
      const complete = () => {
        if (closeCode === undefined || !writeDone) return;
        const durationMs = Date.now() - startTime;
        fs.promises
          .stat(filePath)
          .then((stat) => {
            finish({ success: true, message: `Backup gerado com sucesso em ${filePath}`, filePath, sizeBytes: stat.size, durationMs });
          })
          .catch(() => {
            finish({ success: true, message: `Backup gerado com sucesso em ${filePath}`, filePath, durationMs });
          });
      };

      // Erro de spawn (binário ausente) derruba o stdout: o setImmediate deixa o 'error' do processo,
      // com a mensagem amigável, chegar antes deste callback.
      pipeline(child.stdout, zlib.createGzip(), fs.createWriteStream(filePath), (err) => {
        if (err) {
          setImmediate(() => {
            child.kill();
            fs.promises.unlink(filePath).catch(() => {});
            finish({ success: false, message: `Falha ao gravar arquivo de backup: ${err.message}`, durationMs: Date.now() - startTime });
          });
          return;
        }
        writeDone = true;
        complete();
      });

      child.on('close', (code) => {
        closeCode = code;
        if (code !== 0) {
          fs.promises.unlink(filePath).catch(() => {});
          finish({
            success: false,
            message: this.formatMysqlCliError('mysqldump', { message: `Processo encerrou com código ${code}` }, stderr),
            durationMs: Date.now() - startTime
          });
          return;
        }
        complete();
      });
    });
  }

  /**
   * Restaura um dump gerado pelo mysqldump. O cliente `mysql` lê o SQL via stdin
   * (não existe flag de "arquivo de origem" no CLI, então o arquivo é streamado).
   * Arquivos terminados em .gz (gerados com compress=true) são descomprimidos em memória
   * durante o streaming, antes de chegar ao stdin do processo mysql.
   */
  private async restoreMysql(
    config: DatabaseConnectionConfig,
    filePath: string,
    mysqlPath?: string
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!config.database || !isValidIdentifier(config.database)) {
      return { success: false, message: 'Nome do banco de dados inválido ou ausente na conexão.' };
    }

    const binary = mysqlPath && mysqlPath.trim() ? mysqlPath.trim() : 'mysql';
    const args = ['-h', config.host, '-P', String(config.port || 3306), '-u', config.user, config.database];

    return new Promise<BackupResult>((resolve) => {
      const child = spawn(binary, args, {
        env: { ...process.env, MYSQL_PWD: config.password || '' }
      });

      let stderr = '';
      let settled = false;
      const timer = setTimeout(() => {
        child.kill();
        finish({ success: false, message: 'mysql excedeu o tempo limite e foi encerrado.', durationMs: Date.now() - startTime });
      }, SPAWN_TIMEOUT_MS);
      const finish = (result: BackupResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err: any) => {
        finish({ success: false, message: this.formatMysqlCliError('mysql', err, stderr), durationMs: Date.now() - startTime });
      });

      child.on('close', (code) => {
        const durationMs = Date.now() - startTime;
        if (code !== 0) {
          finish({
            success: false,
            message: this.formatMysqlCliError('mysql', { message: `Processo encerrou com código ${code}` }, stderr),
            durationMs
          });
          return;
        }
        finish({ success: true, message: `Restauração concluída a partir de ${filePath}`, durationMs });
      });

      // pipeline propaga e trata erro de qualquer ponta: arquivo ilegível, .gz corrompido ou EPIPE no stdin
      // do mysql (que encerrou cedo) — antes, um 'error' sem handler derrubava o processo principal.
      const source = fs.createReadStream(filePath);
      const done = (err: NodeJS.ErrnoException | null) => {
        if (!err) return;
        // Se o mysql morreu primeiro, a causa real está no 'close'/stderr dele: deixa ele responder.
        setImmediate(() => {
          if (settled) return;
          child.kill();
          finish({ success: false, message: `Falha ao ler o arquivo de restauração: ${err.message}`, durationMs: Date.now() - startTime });
        });
      };
      if (/\.gz$/i.test(filePath)) {
        pipeline(source, zlib.createGunzip(), child.stdin, done);
      } else {
        pipeline(source, child.stdin, done);
      }
    });
  }

  /**
   * Executa um export lógico via expdp. Diferente do pg_dump, o expdp roda no lado do
   * servidor Oracle: o dump é gravado no caminho do objeto DIRECTORY do banco, não em
   * destinationFolder diretamente. Para funcionar, destinationFolder deve apontar para o
   * mesmo caminho físico que o DIRECTORY do Oracle usa (cenário comum em bancos de dev
   * rodando na própria máquina). A senha é enviada via stdin, nunca como argumento de
   * linha de comando, para não ficar visível na lista de processos.
   */
  private async backupOracle(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    expdpPath?: string,
    oracleDirectory?: string,
    compress?: boolean
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!config.user || !isValidIdentifier(config.user)) {
      return { success: false, message: 'Usuário da conexão inválido ou ausente.' };
    }

    const directory = (oracleDirectory && oracleDirectory.trim()) || 'DATA_PUMP_DIR';
    if (!isValidIdentifier(directory)) {
      return { success: false, message: 'Nome do DIRECTORY Oracle inválido.' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeConnName = (config.name || config.user).replace(/[^a-zA-Z0-9_-]/g, '_');
    const dumpFileName = `${safeConnName}_${config.user}_${timestamp}.dmp`;
    const logFileName = `${safeConnName}_${config.user}_${timestamp}.log`;
    const expectedFilePath = path.join(destinationFolder, dumpFileName);

    // Mesma sintaxe de connect string usada pelo driver oracledb (ver DatabaseService.getOracleConnection)
    const separator = config.oracleMode === 'sid' ? ':' : '/';
    const connectString = `${config.host}:${config.port || 1521}${separator}${config.database}`;

    const binary = expdpPath && expdpPath.trim() ? expdpPath.trim() : 'expdp';
    const args = [
      `${config.user}@${connectString}`,
      `directory=${directory}`,
      `dumpfile=${dumpFileName}`,
      `logfile=${logFileName}`,
      `schemas=${config.user}`
    ];
    // compression=ALL exige Oracle Enterprise Edition com Advanced Compression; impdp lê o
    // dump compactado de forma transparente, sem precisar de flag equivalente na restauração.
    if (compress) args.push('compression=ALL');

    return new Promise<BackupResult>((resolve) => {
      const child = execFile(
        binary,
        args,
        {
          maxBuffer: 20 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;

          if (error) {
            resolve({ success: false, message: this.formatOracleCliError('expdp', error, stdout, stderr), durationMs });
            return;
          }

          fs.promises
            .stat(expectedFilePath)
            .then((stat) => {
              resolve({
                success: true,
                message: `Backup gerado com sucesso em ${expectedFilePath}`,
                filePath: expectedFilePath,
                sizeBytes: stat.size,
                durationMs
              });
            })
            .catch(() => {
              resolve({
                success: true,
                message: `expdp concluído, mas o dump não foi encontrado em ${destinationFolder}. Verifique se esse caminho corresponde ao do DIRECTORY '${directory}' no servidor Oracle (${dumpFileName} deve estar lá).`,
                durationMs
              });
            });
        }
      );

      // expdp pede a senha interativamente; enviamos via stdin para não expor em argv/process list.
      child.stdin?.write(`${config.password || ''}\n`);
      child.stdin?.end();
    });
  }

  /**
   * Restaura um dump via impdp. O arquivo precisa estar fisicamente na pasta do
   * servidor referenciada pelo DIRECTORY (mesmo caminho usado no backup); só o nome
   * do arquivo é enviado ao impdp, nunca o caminho completo do cliente.
   */
  private async restoreOracle(
    config: DatabaseConnectionConfig,
    filePath: string,
    impdpPath?: string,
    oracleDirectory?: string
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!config.user || !isValidIdentifier(config.user)) {
      return { success: false, message: 'Usuário da conexão inválido ou ausente.' };
    }

    const directory = (oracleDirectory && oracleDirectory.trim()) || 'DATA_PUMP_DIR';
    if (!isValidIdentifier(directory)) {
      return { success: false, message: 'Nome do DIRECTORY Oracle inválido.' };
    }

    const dumpFileName = path.basename(filePath);
    const logFileName = `restore_${Date.now()}.log`;

    const separator = config.oracleMode === 'sid' ? ':' : '/';
    const connectString = `${config.host}:${config.port || 1521}${separator}${config.database}`;

    const binary = impdpPath && impdpPath.trim() ? impdpPath.trim() : 'impdp';
    const args = [
      `${config.user}@${connectString}`,
      `directory=${directory}`,
      `dumpfile=${dumpFileName}`,
      `logfile=${logFileName}`,
      `schemas=${config.user}`
    ];

    return new Promise<BackupResult>((resolve) => {
      const child = execFile(
        binary,
        args,
        {
          maxBuffer: 20 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          if (error) {
            resolve({ success: false, message: this.formatOracleCliError('impdp', error, stdout, stderr), durationMs });
            return;
          }
          resolve({ success: true, message: `Restauração concluída a partir de ${dumpFileName}`, durationMs });
        }
      );

      child.stdin?.write(`${config.password || ''}\n`);
      child.stdin?.end();
    });
  }

  private formatMysqlCliError(binary: string, error: { code?: string | number | null; message?: string }, stderr?: string): string {
    if (error.code === 'ENOENT') {
      return `${binary} não encontrado. Instale o cliente MySQL/MariaDB ou configure o caminho do executável nas configurações.`;
    }
    const msg = (stderr || error.message || '').trim();
    if (msg.includes('Access denied')) {
      return 'Falha de autenticação: usuário ou senha incorretos para o MySQL.';
    }
    if (msg.includes("Can't connect") || msg.includes('ECONNREFUSED') || msg.includes('2002')) {
      return 'Não foi possível conectar ao servidor MySQL. Verifique host/porta e se o banco está ativo.';
    }
    if (msg.includes('Unknown database')) {
      return 'Banco de dados não encontrado no servidor MySQL.';
    }
    return msg || `Falha desconhecida ao executar ${binary}.`;
  }

  private formatOracleCliError(
    binary: string,
    error: { code?: string | number | null; message?: string },
    stdout?: string,
    stderr?: string
  ): string {
    if (error.code === 'ENOENT') {
      return `${binary} não encontrado. Instale o Oracle Instant Client (pacote 'Tools') ou configure o caminho do executável nas configurações.`;
    }
    const msg = (stdout || stderr || error.message || '').trim();
    if (msg.includes('ORA-01017')) {
      return 'Falha de autenticação: usuário ou senha incorretos para o Oracle.';
    }
    if (msg.includes('ORA-39002') || msg.includes('ORA-39070') || msg.includes('ORA-39087')) {
      return `DIRECTORY Oracle inválido ou inexistente, ou sem permissão de acesso ao caminho. Peça ao DBA para criar/conceder acesso ao DIRECTORY usado.`;
    }
    if (msg.includes('ORA-39001') || msg.includes('ORA-31640')) {
      return 'Arquivo de dump não encontrado no DIRECTORY do servidor Oracle. Confirme se o arquivo está na pasta correta no servidor.';
    }
    if (msg.includes('ORA-31684')) {
      return 'Objeto já existe no schema de destino. O impdp não sobrescreve objetos existentes por padrão.';
    }
    if (msg.includes('ORA-12541') || msg.includes('TNS:no listener')) {
      return 'Oracle Listener não encontrado no host e porta especificados (ORA-12541).';
    }
    if (msg.includes('ORA-12514')) {
      return 'Serviço/Banco Oracle não encontrado pelo Listener (ORA-12514). Verifique o Service Name / SID.';
    }
    return msg || `Falha desconhecida ao executar ${binary}.`;
  }

  private formatPostgresCliError(binary: string, error: { code?: string | number | null; message?: string }, stderr?: string): string {
    if (error.code === 'ENOENT') {
      return `${binary} não encontrado. Instale o cliente PostgreSQL (inclui pg_dump e psql) ou configure o caminho do executável nas configurações.`;
    }
    const msg = (stderr || error.message || '').trim();
    if (msg.includes('password authentication failed')) {
      return 'Falha de autenticação: usuário ou senha incorretos para o PostgreSQL.';
    }
    if (msg.includes('could not connect') || msg.includes('ECONNREFUSED')) {
      return 'Não foi possível conectar ao servidor PostgreSQL. Verifique host/porta e se o banco está ativo.';
    }
    return msg || `Falha desconhecida ao executar ${binary}.`;
  }
}
