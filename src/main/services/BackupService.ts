import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream';
import crypto from 'crypto';
import { execFile, spawn } from 'child_process';
import { DatabaseConnectionConfig, BackupResult, BackupFileInfo, BackupHelp } from '../../shared/types';
import { isSafeLocalPath, isValidIdentifier } from '../utils/security';
import type { ConfigService } from './ConfigService';
import type { DatabaseService } from './DatabaseService';
import { buildOracleConnectEnv } from '../../shared/oracleCliConnect';
import { buildOracleToolEnv, isOracleTool } from './database/oracleToolEnv';
import {
  explainOracleFailure,
  extractOracleErrorLines,
  isOracleDirectoryError,
  ORACLE_DETAIL_LABEL,
  type OracleDirectoryInfo,
  type OracleFailureContext
} from './database/oracleBackupHelp';
import {
  explainPostgresFailure,
  extractPostgresErrorLines,
  isPostgresMissingDatabase,
  isPostgresTool,
  POSTGRES_DETAIL_LABEL,
  type PostgresFailureContext
} from './database/postgresBackupHelp';
import { buildOracleParfileContent, writeTempOracleParfile } from './database/oracleParfile';

/** Tempo máximo de um dump/restore MySQL via spawn (os execFile dos demais bancos já têm timeout). */
const SPAWN_TIMEOUT_MS = 20 * 60 * 1000;

/** Tempo máximo do expdp/impdp. Schemas reais passam fácil de 10 minutos. */
const ORACLE_DATAPUMP_TIMEOUT_MS = 60 * 60 * 1000;

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
  /** Oracle: schema gravado no dump, quando difere do usuário de destino (drill num usuário scratch). Vira remap_schema no impdp. */
  oracleSourceSchema?: string;
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
  const map: Record<string, string> = {
    user: placeholders.user,
    password: placeholders.password || '',
    host: placeholders.host,
    port: placeholders.port,
    database: placeholders.database,
    connectString: placeholders.connectString,
    directory: placeholders.directory,
    folder: placeholders.folder,
    fileName: placeholders.fileName,
    filePath: placeholders.filePath,
    logFileName: placeholders.logFileName,
    logPath: placeholders.logPath,
    timestamp: placeholders.timestamp
  };

  // Uma passada só: um valor que contenha "{filePath}" (ex.: na senha) não é substituído de novo.
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : match
  );
}

/** Parte do nome de arquivo derivada de um texto livre, do jeito que os backups a gravam. */
function safeFileNamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Sufixo de todo arquivo de backup gerado pelo Dev Manager: o timestamp ISO e a extensão. */
const BACKUP_FILE_SUFFIX = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.(sql(\.gz)?|dump|dmp)$/i;

/**
 * Indica se o arquivo foi gerado por um backup desta conexão (`<conexão>_<banco ou usuário>_<timestamp>.<ext>`).
 * Retenção e drill só mexem nesses arquivos: a pasta pode ser compartilhada com outras conexões ou ter scripts do usuário.
 */
export function isBackupFileOfConnection(fileName: string, config: Pick<DatabaseConnectionConfig, 'name' | 'database' | 'user'>): boolean {
  const middles = new Set(
    [config.database, config.user].filter((v): v is string => !!v).map(safeFileNamePart)
  );
  if (middles.size === 0) middles.add('backup');
  // Prefixo = nome da conexão; sem nome, cada backup cai no banco (Postgres/MySQL) ou no usuário (Oracle).
  const connNames = new Set(
    [config.name || config.database || config.user, config.name || config.user]
      .filter((v): v is string => !!v)
      .map(safeFileNamePart)
  );
  for (const conn of connNames) {
    for (const middle of middles) {
      const prefix = `${conn}_${middle}_`;
      if (fileName.startsWith(prefix) && BACKUP_FILE_SUFFIX.test(fileName.slice(prefix.length))) return true;
    }
  }
  return false;
}

/**
 * Ambiente do pg_dump/psql/pg_restore. LC_MESSAGES=C deixa as mensagens do próprio cliente em
 * inglês, que é o que a ajuda "Como resolver" reconhece com certeza (as do servidor seguem o idioma dele).
 */
function postgresToolEnv(config: DatabaseConnectionConfig): NodeJS.ProcessEnv {
  return { ...process.env, PGPASSWORD: config.password || '', LC_MESSAGES: 'C' };
}

/** Extensões de backup que cada tipo de banco sabe restaurar. */
const RESTORABLE_EXTENSIONS: Record<DatabaseConnectionConfig['type'], RegExp> = {
  postgres: /\.(sql|dump)$/i,
  oracle: /\.dmp$/i,
  mysql: /\.sql(\.gz)?$/i
};

const RESTORABLE_EXTENSION_LABELS: Record<DatabaseConnectionConfig['type'], string> = {
  postgres: '.sql ou .dump',
  oracle: '.dmp',
  mysql: '.sql ou .sql.gz'
};

/** Mesmo banco físico: mesmo id, ou mesmo host, porta e banco (e usuário, no Oracle, onde o schema é o usuário). */
export function isSameDatabaseTarget(a: DatabaseConnectionConfig, b: DatabaseConnectionConfig): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  const sameHost = (a.host || '').toLowerCase() === (b.host || '').toLowerCase();
  const samePort = String(a.port || '') === String(b.port || '');
  const sameDb = (a.database || '').toLowerCase() === (b.database || '').toLowerCase();
  if (!(sameHost && samePort && sameDb && a.type === b.type)) return false;
  return a.type === 'oracle' ? (a.user || '').toLowerCase() === (b.user || '').toLowerCase() : true;
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
  constructor(
    private configService?: ConfigService,
    /** Usado para listar os DIRECTORY do Oracle quando o backup falha por causa deles. */
    private databaseService?: Pick<DatabaseService, 'executeQuery'>
  ) {}

  /**
   * Resolve a senha da conexão caso tenha vindo em branco/sanitizada, buscando nas
   * configurações salvas em memória através do id da conexão ou da tupla (host, port, user, database).
   */
  public resolveConnectionConfig(config: DatabaseConnectionConfig): DatabaseConnectionConfig {
    if (config.password || !this.configService) {
      return config;
    }
    const settings = this.configService.getSettings();
    // Só preenche a senha salva quando o destino é o mesmo da conexão salva: casar só pelo id
    // deixaria quem chama (MCP/HTTP) mandar a senha de uma conexão para outro host.
    const saved = settings.databaseConnections?.find(
      (c) =>
        String(c.host) === String(config.host) &&
        String(c.port) === String(config.port) &&
        c.user === config.user &&
        c.database === config.database &&
        (!config.id || c.id === config.id || !settings.databaseConnections?.some((o) => o.id === config.id))
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
            ...(isOracleTool(binary) ? buildOracleToolEnv(binary) : process.env),
            // Sem conexão explícita no comando (ex.: só {user}/{password}), o utilitário Oracle usa esta.
            ...(config.type === 'oracle' ? buildOracleConnectEnv(config) : {}),
            PGPASSWORD: config.password || '',
            MYSQL_PWD: config.password || ''
          },
          // Um comando que usa só {fileName} grava relativo à pasta atual: que seja a de destino.
          cwd: destinationFolder,
          maxBuffer: 20 * 1024 * 1024,
          timeout: 20 * 60 * 1000
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const maskedStderr = maskSensitiveText(stderr || '', config.password);
          const maskedStdout = maskSensitiveText(stdout || '', config.password);

          if (error) {
            // Dump pela metade não pode ficar na pasta: entraria na retenção e no drill como se fosse válido.
            fs.promises.unlink(targetFilePath).catch(() => {});
            const maskedErrMessage = maskSensitiveText(error.message || '', config.password);
            const detail = maskedStderr.trim() || maskedStdout.trim() || maskedErrMessage;
            const fallback = `Falha ao executar comando personalizado (${path.basename(binary)}): ${detail}`;
            if (config.type === 'oracle' && isOracleTool(binary)) {
              void this.describeOracleFailure(config, `${maskedStdout}\n${maskedStderr}`, {
                binary,
                operation: 'backup',
                directory: placeholders.directory,
                localPath: destinationFolder
              }).then((explained) => resolve({ success: false, ...(explained ?? { message: fallback }), durationMs }));
              return;
            }
            if (config.type === 'postgres' && isPostgresTool(binary)) {
              void this.describePostgresFailure(config, `${maskedStdout}\n${maskedStderr}`, { binary, operation: 'backup' }).then(
                (explained) => resolve({ success: false, ...(explained ?? { message: fallback }), durationMs })
              );
              return;
            }
            resolve({ success: false, message: fallback, durationMs });
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
    options?: BackupOptions,
    /** Conexão que gerou o backup; o drill recusa rodar sobre ela. */
    sourceConfig?: DatabaseConnectionConfig
  ): Promise<BackupResult> {
    scratchConfig = this.resolveConnectionConfig(scratchConfig);
    const refusal = this.restoreDrillRefusal(scratchConfig, filePath, sourceConfig);
    if (refusal) return { success: false, message: refusal };

    const result = await this.restoreBackup(scratchConfig, filePath, options);
    if (result.success) {
      result.checksumSha256 = await this.computeChecksum(filePath).catch(() => undefined);
    }
    return result;
  }

  /**
   * Motivo para não rodar o drill, ou null. O drill sobrescreve o destino, então nunca roda sobre
   * a conexão de origem (informada, ou reconhecida pelo nome do arquivo) nem sobre uma de produção.
   */
  private restoreDrillRefusal(
    scratch: DatabaseConnectionConfig,
    filePath: string,
    source?: DatabaseConnectionConfig
  ): string | null {
    if (scratch.isProduction) {
      return `A conexão ${scratch.name} está marcada como produção e não pode ser usada como destino do teste de restauração.`;
    }
    if ((source && isSameDatabaseTarget(source, scratch)) || isBackupFileOfConnection(path.basename(filePath), scratch)) {
      return `A conexão ${scratch.name} é a origem deste backup. Escolha uma conexão descartável, de outro banco, para o teste de restauração.`;
    }
    if (source && source.type !== scratch.type) {
      return `O backup é de ${source.type} e a conexão ${scratch.name} é ${scratch.type}: escolha uma conexão do mesmo tipo.`;
    }
    return null;
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

    const restorable = RESTORABLE_EXTENSIONS[config.type];
    if (restorable && !restorable.test(filePath)) {
      return {
        success: false,
        message: `O arquivo ${path.basename(filePath)} não é um backup que a conexão ${config.name} (${config.type}) restaure. Esperado: ${RESTORABLE_EXTENSION_LABELS[config.type]}.`
      };
    }

    if (!this.acquireLock(config.id)) {
      return { success: false, message: 'Já existe um backup ou restauração em andamento para esta conexão.' };
    }

    try {
      switch (config.type) {
        case 'postgres':
          return await this.restorePostgres(config, filePath, options?.psqlPath, options?.pgRestorePath);
        case 'oracle':
          return await this.restoreOracle(config, filePath, options?.impdpPath, options?.oracleDirectory, options?.oracleSourceSchema);
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
   * Com `connection`, só os gerados por backups dessa conexão (a pasta pode ser compartilhada).
   * A data é a de modificação: a de criação muda quando o arquivo é copiado para a pasta.
   */
  public async listBackups(
    destinationFolder: string,
    connection?: Pick<DatabaseConnectionConfig, 'name' | 'database' | 'user'>
  ): Promise<BackupFileInfo[]> {
    if (!isSafeLocalPath(destinationFolder) || !fs.existsSync(destinationFolder)) return [];

    const entries = await fs.promises.readdir(destinationFolder, { withFileTypes: true });
    const files = entries.filter(
      (e) =>
        e.isFile() &&
        /\.(sql(\.gz)?|dump|dmp)$/i.test(e.name) &&
        (!connection || isBackupFileOfConnection(e.name, connection))
    );

    const infos: BackupFileInfo[] = [];
    for (const file of files) {
      const filePath = path.join(destinationFolder, file.name);
      try {
        const stat = await fs.promises.stat(filePath);
        infos.push({
          fileName: file.name,
          filePath,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString()
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
   * são independentes — um arquivo é apagado se violar qualquer um deles. Só considera os backups
   * gerados por `connection`: outras conexões na mesma pasta e scripts do usuário ficam intactos.
   */
  public async applyRetention(
    destinationFolder: string,
    connection: Pick<DatabaseConnectionConfig, 'name' | 'database' | 'user'>,
    retentionCount?: number,
    retentionDays?: number
  ): Promise<number> {
    if (!retentionCount && !retentionDays) return 0;

    const files = await this.listBackups(destinationFolder, connection);
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
    // Dump em SQL puro sem --clean falhava ao restaurar sobre uma base existente (relation already exists).
    // O formato custom já é restaurado com --clean --if-exists; o puro passa a se comportar igual.
    if (!compress) args.push('--clean', '--if-exists');

    return new Promise<BackupResult>((resolve) => {
      execFile(
        binary,
        args,
        {
          env: postgresToolEnv(config),
          maxBuffer: 20 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        },
        (error, _stdout, stderr) => {
          const durationMs = Date.now() - startTime;

          if (error) {
            fs.promises.unlink(filePath).catch(() => {});
            void this.postgresCliFailure(config, binary, error, stderr, 'backup').then((failure) =>
              resolve({ ...failure, durationMs })
            );
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
          // Tudo ou nada: um erro no meio não deixa o banco com os DROP feitos e metade recriada.
          '--single-transaction',
          filePath
        ]
      : [
          '-h', config.host,
          '-p', String(config.port || 5432),
          '-U', config.user,
          '-d', config.database,
          '--no-password',
          '--no-psqlrc',
          '--single-transaction',
          '-f', filePath,
          '-v', 'ON_ERROR_STOP=1'
        ];

    return new Promise<BackupResult>((resolve) => {
      const child = execFile(
        binary,
        args,
        {
          env: postgresToolEnv(config),
          maxBuffer: 20 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        },
        (error, _stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          if (error) {
            void this.postgresCliFailure(config, binary, error, stderr, 'restore').then((failure) =>
              resolve({ ...failure, durationMs })
            );
            return;
          }
          resolve({ success: true, message: `Restauração concluída a partir de ${filePath}`, durationMs });
        }
      );

      // Sem stdin: se o servidor ainda pedir senha, falha na hora em vez de esperar o timeout.
      child.stdin?.end();
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
   * rodando na própria máquina). Usuário e senha vão num parfile temporário, nunca como
   * argumento de linha de comando, para não ficarem visíveis na lista de processos.
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

    const binary = expdpPath && expdpPath.trim() ? expdpPath.trim() : 'expdp';
    const params = [
      `directory=${directory}`,
      `dumpfile=${dumpFileName}`,
      `logfile=${logFileName}`,
      `schemas=${config.user}`
    ];
    // compression=ALL exige Oracle Enterprise Edition com Advanced Compression; impdp lê o
    // dump compactado de forma transparente, sem precisar de flag equivalente na restauração.
    if (compress) params.push('compression=ALL');

    const parfile = await this.prepareOracleParfile(config, params);
    if ('message' in parfile) return parfile;

    return new Promise<BackupResult>((resolve) => {
      const child = execFile(
        binary,
        [`parfile=${parfile.filePath}`],
        {
          env: { ...buildOracleToolEnv(binary), ...buildOracleConnectEnv(config) },
          maxBuffer: 20 * 1024 * 1024,
          timeout: ORACLE_DATAPUMP_TIMEOUT_MS
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;

          if (error) {
            void this.oracleCliFailure(config, binary, error, stdout, stderr, {
              binary,
              operation: 'backup',
              directory,
              localPath: destinationFolder
            }).then((failure) => resolve({ ...failure, durationMs }));
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

      // Sem stdin: se ainda assim pedir a senha, falha em vez de ficar esperando.
      child.stdin?.end();
    }).finally(() => parfile.cleanup().catch(() => undefined));
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
    oracleDirectory?: string,
    sourceSchema?: string
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

    const binary = impdpPath && impdpPath.trim() ? impdpPath.trim() : 'impdp';
    const source = sourceSchema?.trim();
    if (source && !isValidIdentifier(source)) {
      return { success: false, message: 'Schema de origem do dump inválido.' };
    }
    // Dump de outro schema (drill num usuário scratch): filtra pelo schema do dump e remapeia para o destino.
    const remap = !!source && source.toUpperCase() !== config.user.toUpperCase();
    const params = [
      `directory=${directory}`,
      `dumpfile=${dumpFileName}`,
      `logfile=${logFileName}`,
      `schemas=${remap ? source : config.user}`
    ];
    if (remap) params.push(`remap_schema=${source}:${config.user}`);

    const parfile = await this.prepareOracleParfile(config, params);
    if ('message' in parfile) return parfile;

    return new Promise<BackupResult>((resolve) => {
      const child = execFile(
        binary,
        [`parfile=${parfile.filePath}`],
        {
          env: { ...buildOracleToolEnv(binary), ...buildOracleConnectEnv(config) },
          maxBuffer: 20 * 1024 * 1024,
          timeout: ORACLE_DATAPUMP_TIMEOUT_MS
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          if (error) {
            void this.oracleCliFailure(config, binary, error, stdout, stderr, {
              binary,
              operation: 'restore',
              directory,
              localPath: filePath
            }).then((failure) => resolve({ ...failure, durationMs }));
            return;
          }
          resolve({ success: true, message: `Restauração concluída a partir de ${dumpFileName}`, durationMs });
        }
      );

      child.stdin?.end();
    }).finally(() => parfile.cleanup().catch(() => undefined));
  }

  /** Grava o parfile do expdp/impdp com usuário e senha; devolve um BackupResult de erro quando não dá. */
  private async prepareOracleParfile(
    config: DatabaseConnectionConfig,
    params: string[]
  ): Promise<{ filePath: string; cleanup: () => Promise<void> } | BackupResult> {
    if (!config.password) {
      return { success: false, message: 'Informe a senha da conexão: o Data Pump (expdp/impdp) não roda sem ela.' };
    }
    try {
      return await writeTempOracleParfile(buildOracleParfileContent(config.user, config.password, params));
    } catch (err: any) {
      return { success: false, message: err?.message || 'Não foi possível gravar o parfile temporário do Oracle.' };
    }
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

  /** Falha do expdp/impdp: executável ausente, erro conhecido com ajuda ou a saída crua do Oracle. */
  private async oracleCliFailure(
    config: DatabaseConnectionConfig,
    binary: string,
    error: { code?: string | number | null; message?: string; killed?: boolean },
    stdout: string | undefined,
    stderr: string | undefined,
    ctx: Omit<OracleFailureContext, 'user' | 'database' | 'oracleMode' | 'directories'>
  ): Promise<BackupResult> {
    if (error.killed) {
      const tool = path.basename(binary).replace(/\.exe$/i, '');
      const minutes = ORACLE_DATAPUMP_TIMEOUT_MS / 60000;
      return {
        success: false,
        message: `O ${tool} passou de ${minutes} minutos e foi interrompido, mas o job do Data Pump pode continuar rodando no servidor.`,
        help: {
          steps: [
            'Matar o cliente não para o job: ele segue no servidor, segurando a tabela de controle e talvez gravando o dump.',
            'Veja os jobs ativos com o SQL abaixo e, se for o caso, conecte-se a ele e pare com KILL_JOB.'
          ],
          snippets: [
            { label: 'Jobs do Data Pump em andamento', code: 'SELECT owner_name, job_name, operation, state FROM dba_datapump_jobs;' },
            { label: `Parar o job (troque pelo job_name)`, code: `${tool} ${config.user} attach=<job_name>\nKILL_JOB` }
          ]
        }
      };
    }
    if (error.code === 'ENOENT') {
      const help: BackupHelp = {
        steps: [
          `Instale o cliente Oracle com o Data Pump: Instant Client Basic + Tools, ou o Oracle Client completo.`,
          `Se ele já está instalado, informe nas configurações de backup o caminho completo do ${path.basename(binary)}.exe, ou ponha a pasta bin dele no PATH e reinicie o Dev Manager.`
        ]
      };
      return { success: false, message: `${binary} não encontrado.`, help };
    }
    const output = maskSensitiveText(`${stdout || ''}\n${stderr || ''}`, config.password);
    const explained = await this.describeOracleFailure(config, output, ctx);
    if (explained) return { success: false, ...explained };
    const raw = maskSensitiveText((stdout || stderr || error.message || '').trim(), config.password);
    return { success: false, message: raw || `Falha desconhecida ao executar ${binary}.` };
  }

  /** Mensagem e passos para um erro conhecido do Oracle; null quando não reconhece. */
  private async describeOracleFailure(
    config: DatabaseConnectionConfig,
    output: string,
    ctx: Omit<OracleFailureContext, 'user' | 'database' | 'oracleMode' | 'directories'>
  ): Promise<{ message: string; help?: BackupHelp } | null> {
    const directories = isOracleDirectoryError(output) ? await this.listOracleDirectories(config) : undefined;
    const explained = explainOracleFailure(output, {
      ...ctx,
      user: config.user,
      database: config.database,
      oracleMode: config.oracleMode,
      directories
    });
    if (explained) return explained;
    const lines = extractOracleErrorLines(output);
    return lines.length > 0
      ? { message: lines[0], help: { steps: [], detail: lines.join('\n'), detailLabel: ORACLE_DETAIL_LABEL } }
      : null;
  }

  /** DIRECTORY que o usuário da conexão enxerga; undefined se não deu para consultar (sem driver, sem acesso, lento). */
  private async listOracleDirectories(config: DatabaseConnectionConfig): Promise<OracleDirectoryInfo[] | undefined> {
    if (!this.databaseService) return undefined;
    const query = this.databaseService
      .executeQuery(config, 'SELECT directory_name, directory_path FROM all_directories ORDER BY directory_name', 100)
      .then((res) =>
        res.success
          ? res.rows.map((r) => ({ name: String(r.DIRECTORY_NAME ?? r.directory_name), path: String(r.DIRECTORY_PATH ?? r.directory_path) }))
          : undefined
      )
      .catch(() => undefined);
    const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 8000).unref?.());
    return Promise.race([query, timeout]);
  }

  /** Falha do pg_dump/psql/pg_restore: executável ausente, erro conhecido com ajuda ou a saída crua. */
  private async postgresCliFailure(
    config: DatabaseConnectionConfig,
    binary: string,
    error: { code?: string | number | null; message?: string },
    stderr: string | undefined,
    operation: PostgresFailureContext['operation']
  ): Promise<BackupResult> {
    const tool = path.basename(binary).replace(/\.exe$/i, '');
    if (error.code === 'ENOENT') {
      const help: BackupHelp = {
        steps: [
          'Instale o cliente PostgreSQL da mesma versão do servidor ou mais nova (o instalador oficial traz pg_dump, psql e pg_restore; dá para instalar só as Command Line Tools).',
          `Se ele já está instalado, informe nas configurações de backup o caminho completo do ${tool}.exe (ex.: C:\\Program Files\\PostgreSQL\\16\\bin\\${tool}.exe), ou ponha a pasta bin no PATH e reinicie o Dev Manager.`
        ]
      };
      return { success: false, message: `${binary} não encontrado.`, help };
    }
    const output = maskSensitiveText(`${stderr || ''}\n${error.message || ''}`, config.password);
    const explained = await this.describePostgresFailure(config, output, { binary, operation });
    if (explained) return { success: false, ...explained };
    const raw = maskSensitiveText((stderr || error.message || '').trim(), config.password);
    return { success: false, message: raw || `Falha desconhecida ao executar ${binary}.` };
  }

  /** Mensagem e passos para um erro conhecido do PostgreSQL; null quando não reconhece. */
  private async describePostgresFailure(
    config: DatabaseConnectionConfig,
    output: string,
    ctx: Pick<PostgresFailureContext, 'binary' | 'operation'>
  ): Promise<{ message: string; help?: BackupHelp } | null> {
    const databases = isPostgresMissingDatabase(output) ? await this.listPostgresDatabases(config) : undefined;
    const explained = explainPostgresFailure(output, {
      ...ctx,
      host: config.host,
      port: config.port || 5432,
      user: config.user,
      database: config.database,
      databases
    });
    if (explained) return explained;
    const lines = extractPostgresErrorLines(output);
    return lines.length > 0
      ? { message: lines[0], help: { steps: [], detail: lines.join('\n'), detailLabel: POSTGRES_DETAIL_LABEL } }
      : null;
  }

  /** Bancos do servidor, consultados pelo banco de manutenção "postgres"; undefined se não deu para consultar. */
  private async listPostgresDatabases(config: DatabaseConnectionConfig): Promise<string[] | undefined> {
    if (!this.databaseService) return undefined;
    const query = this.databaseService
      .executeQuery(
        { ...config, database: 'postgres' },
        'SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname',
        200
      )
      .then((res) => (res.success ? res.rows.map((r) => String(r.datname ?? r.DATNAME)) : undefined))
      .catch(() => undefined);
    const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 8000).unref?.());
    return Promise.race([query, timeout]);
  }
}
