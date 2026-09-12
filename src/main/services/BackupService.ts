import fs from 'fs';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { DatabaseConnectionConfig, BackupResult, BackupFileInfo } from '../../shared/types';
import { isSafeLocalPath, isValidIdentifier } from '../utils/security';

export interface BackupOptions {
  pgDumpPath?: string;
  expdpPath?: string;
  mysqldumpPath?: string;
  psqlPath?: string;
  impdpPath?: string;
  mysqlPath?: string;
  /** Nome do objeto DIRECTORY do Oracle (ex: DATA_PUMP_DIR) cujo caminho no servidor deve
   * corresponder a destinationFolder (expdp/impdp gravam/leem no servidor, não no cliente). */
  oracleDirectory?: string;
}

export class BackupService {
  /**
   * Executa um backup lógico da conexão informada, salvando o arquivo em destinationFolder.
   * Suporta PostgreSQL (pg_dump), Oracle (expdp) e MySQL (mysqldump).
   */
  public async runBackup(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    options?: BackupOptions
  ): Promise<BackupResult> {
    if (!isSafeLocalPath(destinationFolder)) {
      return { success: false, message: 'Pasta de destino inválida.' };
    }

    switch (config.type) {
      case 'postgres':
        return this.backupPostgres(config, destinationFolder, options?.pgDumpPath);
      case 'oracle':
        return this.backupOracle(config, destinationFolder, options?.expdpPath, options?.oracleDirectory);
      case 'mysql':
        return this.backupMysql(config, destinationFolder, options?.mysqldumpPath);
      default:
        return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado para backup.` };
    }
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
    if (!isSafeLocalPath(filePath) || !fs.existsSync(filePath)) {
      return { success: false, message: 'Arquivo de backup não encontrado.' };
    }

    switch (config.type) {
      case 'postgres':
        return this.restorePostgres(config, filePath, options?.psqlPath);
      case 'oracle':
        return this.restoreOracle(config, filePath, options?.impdpPath, options?.oracleDirectory);
      case 'mysql':
        return this.restoreMysql(config, filePath, options?.mysqlPath);
      default:
        return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado para restauração.` };
    }
  }

  /**
   * Lista os arquivos de backup (.sql / .dump / .dmp) já existentes em uma pasta, mais recentes primeiro.
   */
  public async listBackups(destinationFolder: string): Promise<BackupFileInfo[]> {
    if (!isSafeLocalPath(destinationFolder) || !fs.existsSync(destinationFolder)) return [];

    const entries = await fs.promises.readdir(destinationFolder, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile() && /\.(sql|dump|dmp)$/i.test(e.name));

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
   * Apaga os backups mais antigos da pasta, mantendo apenas os `retentionCount` mais recentes.
   */
  public async applyRetention(destinationFolder: string, retentionCount: number): Promise<number> {
    if (!retentionCount || retentionCount <= 0) return 0;

    const files = await this.listBackups(destinationFolder);
    const toDelete = files.slice(retentionCount);

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
    pgDumpPath?: string
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

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeConnName = (config.name || config.database).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeConnName}_${config.database}_${timestamp}.sql`;
    const filePath = path.join(destinationFolder, fileName);

    const binary = pgDumpPath && pgDumpPath.trim() ? pgDumpPath.trim() : 'pg_dump';
    const args = [
      '-h', config.host,
      '-p', String(config.port || 5432),
      '-U', config.user,
      '-d', config.database,
      '-f', filePath,
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
   * Restaura um dump plain-SQL do PostgreSQL via psql -f. Roda diretamente contra o
   * banco da conexão informada — pode falhar em objetos já existentes se o banco não
   * estiver vazio (comportamento normal de um dump plain-SQL sem DROP prévio).
   */
  private async restorePostgres(
    config: DatabaseConnectionConfig,
    filePath: string,
    psqlPath?: string
  ): Promise<BackupResult> {
    const startTime = Date.now();

    if (!config.database || !isValidIdentifier(config.database)) {
      return { success: false, message: 'Nome do banco de dados inválido ou ausente na conexão.' };
    }

    const binary = psqlPath && psqlPath.trim() ? psqlPath.trim() : 'psql';
    const args = [
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
            resolve({ success: false, message: this.formatPostgresCliError('psql', error, stderr), durationMs });
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
    mysqldumpPath?: string
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

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeConnName = (config.name || config.database).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeConnName}_${config.database}_${timestamp}.sql`;
    const filePath = path.join(destinationFolder, fileName);

    const binary = mysqldumpPath && mysqldumpPath.trim() ? mysqldumpPath.trim() : 'mysqldump';
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

  /**
   * Restaura um dump gerado pelo mysqldump. O cliente `mysql` lê o SQL via stdin
   * (não existe flag de "arquivo de origem" no CLI, então o arquivo é streamado).
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
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err: any) => {
        const durationMs = Date.now() - startTime;
        resolve({ success: false, message: this.formatMysqlCliError('mysql', err, stderr), durationMs });
      });

      child.on('close', (code) => {
        const durationMs = Date.now() - startTime;
        if (code !== 0) {
          resolve({
            success: false,
            message: this.formatMysqlCliError('mysql', { message: `Processo encerrou com código ${code}` }, stderr),
            durationMs
          });
          return;
        }
        resolve({ success: true, message: `Restauração concluída a partir de ${filePath}`, durationMs });
      });

      const readStream = fs.createReadStream(filePath);
      readStream.on('error', () => child.stdin.end());
      readStream.pipe(child.stdin);
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
