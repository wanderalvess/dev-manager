import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { DatabaseConnectionConfig, BackupResult, BackupFileInfo } from '../../shared/types';
import { isSafeLocalPath, isValidIdentifier } from '../utils/security';

export class BackupService {
  /**
   * Executa um backup lógico da conexão informada, salvando o arquivo em destinationFolder.
   * Por enquanto só PostgreSQL é suportado (via pg_dump); Oracle e MySQL retornam erro explícito.
   */
  public async runBackup(
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    pgDumpPath?: string
  ): Promise<BackupResult> {
    if (!isSafeLocalPath(destinationFolder)) {
      return { success: false, message: 'Pasta de destino inválida.' };
    }

    switch (config.type) {
      case 'postgres':
        return this.backupPostgres(config, destinationFolder, pgDumpPath);
      case 'oracle':
        return { success: false, message: 'Backup automático para Oracle ainda não implementado (em breve via expdp).' };
      case 'mysql':
        return { success: false, message: 'Backup automático para MySQL ainda não implementado (em breve via mysqldump).' };
      default:
        return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado para backup.` };
    }
  }

  /**
   * Lista os arquivos de backup (.sql / .dump) já existentes em uma pasta, mais recentes primeiro.
   */
  public async listBackups(destinationFolder: string): Promise<BackupFileInfo[]> {
    if (!isSafeLocalPath(destinationFolder) || !fs.existsSync(destinationFolder)) return [];

    const entries = await fs.promises.readdir(destinationFolder, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile() && /\.(sql|dump)$/i.test(e.name));

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
