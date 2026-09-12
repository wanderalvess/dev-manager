import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { DatabaseConnectionConfig, BackupResult, BackupFileInfo } from '../../shared/types';
import { isSafeLocalPath, isValidIdentifier } from '../utils/security';

export interface BackupOptions {
  pgDumpPath?: string;
  expdpPath?: string;
  /** Nome do objeto DIRECTORY do Oracle (ex: DATA_PUMP_DIR) cujo caminho no servidor deve
   * corresponder a destinationFolder (expdp grava no servidor, não no cliente). */
  oracleDirectory?: string;
}

export class BackupService {
  /**
   * Executa um backup lógico da conexão informada, salvando o arquivo em destinationFolder.
   * Suporta PostgreSQL (pg_dump) e Oracle (expdp); MySQL ainda retorna erro explícito.
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
        return { success: false, message: 'Backup automático para MySQL ainda não implementado (em breve via mysqldump).' };
      default:
        return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado para backup.` };
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
              message: this.formatPgDumpError(error, stderr),
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
            resolve({ success: false, message: this.formatExpdpError(error, stdout, stderr), durationMs });
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

  private formatExpdpError(error: { code?: string | number | null; message?: string }, stdout?: string, stderr?: string): string {
    if (error.code === 'ENOENT') {
      return "expdp não encontrado. Instale o Oracle Instant Client (pacote 'Tools') ou configure o caminho do executável nas configurações.";
    }
    const msg = (stdout || stderr || error.message || '').trim();
    if (msg.includes('ORA-01017')) {
      return 'Falha de autenticação: usuário ou senha incorretos para o Oracle.';
    }
    if (msg.includes('ORA-39002') || msg.includes('ORA-39070') || msg.includes('ORA-39087')) {
      return `DIRECTORY Oracle inválido ou inexistente, ou sem permissão de acesso ao caminho. Peça ao DBA para criar/conceder acesso ao DIRECTORY usado.`;
    }
    if (msg.includes('ORA-12541') || msg.includes('TNS:no listener')) {
      return 'Oracle Listener não encontrado no host e porta especificados (ORA-12541).';
    }
    if (msg.includes('ORA-12514')) {
      return 'Serviço/Banco Oracle não encontrado pelo Listener (ORA-12514). Verifique o Service Name / SID.';
    }
    return msg || 'Falha desconhecida ao executar expdp.';
  }

  private formatPgDumpError(error: { code?: string | number | null; message?: string }, stderr?: string): string {
    if (error.code === 'ENOENT') {
      return "pg_dump não encontrado. Instale o cliente PostgreSQL (inclui pg_dump) ou configure o caminho do executável nas configurações.";
    }
    const msg = (stderr || error.message || '').trim();
    if (msg.includes('password authentication failed')) {
      return 'Falha de autenticação: usuário ou senha incorretos para o PostgreSQL.';
    }
    if (msg.includes('could not connect') || msg.includes('ECONNREFUSED')) {
      return 'Não foi possível conectar ao servidor PostgreSQL. Verifique host/porta e se o banco está ativo.';
    }
    return msg || 'Falha desconhecida ao executar pg_dump.';
  }
}
