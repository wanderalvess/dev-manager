import fs from 'fs';
import path from 'path';
import { LogWatchStatus, LogChunkEvent } from '../../shared/types';
import { isSafeLocalPath } from '../utils/security';

interface ActiveWatcher {
  sourceId: string;
  filePath: string;
  encoding: BufferEncoding;
  lastOffset: number;
  lastMtimeMs: number;
  timer: NodeJS.Timeout | null;
  fsWatcher: fs.FSWatcher | null;
  onChunk: (event: LogChunkEvent) => void;
  partialLine: string;
}

export class LogWatcherService {
  private watchers = new Map<string, ActiveWatcher>();

  /**
   * Verifica o status físico do arquivo de log no sistema operacional.
   */
  public checkFile(filePath: string, sourceId: string = ''): LogWatchStatus {
    if (!filePath || typeof filePath !== 'string' || !isSafeLocalPath(filePath)) {
      return {
        sourceId,
        filePath: filePath || '',
        exists: false,
        fileSizeBytes: 0,
        watching: this.watchers.has(sourceId),
        error: 'Caminho de arquivo inválido ou não seguro'
      };
    }

    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        return {
          sourceId,
          filePath,
          exists: true,
          fileSizeBytes: stat.size,
          lastModified: stat.mtime.toISOString(),
          watching: this.watchers.has(sourceId)
        };
      }
      return {
        sourceId,
        filePath,
        exists: false,
        fileSizeBytes: 0,
        watching: this.watchers.has(sourceId)
      };
    } catch (err: any) {
      return {
        sourceId,
        filePath,
        exists: false,
        fileSizeBytes: 0,
        watching: this.watchers.has(sourceId),
        error: err.message || 'Erro ao acessar arquivo'
      };
    }
  }

  /**
   * Lê eficientemente as últimas linhas do arquivo especificado.
   * Evita ler o arquivo inteiro na memória caso ele tenha centenas de megabytes.
   */
  public async readLastLines(
    filePath: string,
    maxLines: number = 300,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<{ lines: string[]; fileSizeBytes: number }> {
    if (!filePath || !fs.existsSync(filePath)) {
      return { lines: [], fileSizeBytes: 0 };
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    if (fileSize === 0) {
      return { lines: [], fileSizeBytes: 0 };
    }

    // Lê até 512KB finais ou o arquivo todo se for menor
    const CHUNK_SIZE = Math.min(fileSize, 512 * 1024);
    const startPosition = fileSize - CHUNK_SIZE;

    const buffer = Buffer.alloc(CHUNK_SIZE);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, CHUNK_SIZE, startPosition);
    } finally {
      fs.closeSync(fd);
    }

    const content = buffer.toString(encoding);
    const rawLines = content.split(/\r?\n/);

    // Se lemos apenas uma fatia no meio do arquivo, a primeira linha pode estar cortada
    if (startPosition > 0 && rawLines.length > 1) {
      rawLines.shift();
    }

    // Pega as últimas N linhas
    const lines = rawLines.slice(Math.max(0, rawLines.length - maxLines));
    return { lines, fileSizeBytes: fileSize };
  }

  /**
   * Inicia o monitoramento contínuo (tail -f) de um arquivo de log.
   */
  public async startWatch(
    sourceId: string,
    filePath: string,
    onChunk: (event: LogChunkEvent) => void,
    initialLinesCount: number = 300,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<{ status: LogWatchStatus; initialLines: string[] }> {
    // Para watcher anterior desta fonte se já estiver ativo
    this.stopWatch(sourceId);

    const status = this.checkFile(filePath, sourceId);
    let initialLines: string[] = [];
    let currentOffset = 0;
    let mtimeMs = 0;

    if (status.exists) {
      try {
        const readResult = await this.readLastLines(filePath, initialLinesCount, encoding);
        initialLines = readResult.lines;
        currentOffset = readResult.fileSizeBytes;
        const stat = fs.statSync(filePath);
        mtimeMs = stat.mtimeMs;
      } catch (err) {
        console.warn(`[LogWatcherService] Erro ao ler linhas iniciais de ${filePath}:`, err);
      }
    }

    const watcherInfo: ActiveWatcher = {
      sourceId,
      filePath,
      encoding,
      lastOffset: currentOffset,
      lastMtimeMs: mtimeMs,
      timer: null,
      fsWatcher: null,
      onChunk,
      partialLine: ''
    };

    // Polling rápido e seguro (600ms) - garante leitura mesmo com locks no Windows
    watcherInfo.timer = setInterval(() => {
      this.pollFileDelta(watcherInfo);
    }, 600);

    // Tenta também fs.watch nativo para acionamento imediato quando o SO suportar
    try {
      if (fs.existsSync(filePath)) {
        watcherInfo.fsWatcher = fs.watch(filePath, { persistent: false }, () => {
          this.pollFileDelta(watcherInfo);
        });
      }
    } catch {
      // Ignora erro de fs.watch nativo se não suportado no SO/arquivo
    }

    this.watchers.set(sourceId, watcherInfo);
    status.watching = true;

    return { status, initialLines };
  }

  /**
   * Processa novos bytes adicionados ao arquivo (delta).
   */
  private pollFileDelta(watcher: ActiveWatcher) {
    const { sourceId, filePath, encoding, onChunk } = watcher;

    try {
      if (!fs.existsSync(filePath)) {
        // Se o arquivo foi removido ou não existe ainda
        if (watcher.lastOffset > 0) {
          watcher.lastOffset = 0;
          watcher.lastMtimeMs = 0;
          watcher.partialLine = '';
          onChunk({
            sourceId,
            filePath,
            lines: ['[LogWatcher] Arquivo foi removido ou rotacionado pelo serviço.'],
            truncatedOrRotated: true,
            timestamp: new Date().toISOString()
          });
        }
        return;
      }

      const stat = fs.statSync(filePath);

      // Se tamanho diminuiu, o arquivo foi truncado ou rotacionado
      if (stat.size < watcher.lastOffset) {
        watcher.lastOffset = 0;
        watcher.lastMtimeMs = stat.mtimeMs;
        watcher.partialLine = '';
        onChunk({
          sourceId,
          filePath,
          lines: ['[LogWatcher] Arquivo foi limpo ou rotacionado (tamanho reduzido).'],
          truncatedOrRotated: true,
          timestamp: new Date().toISOString()
        });
      }

      // Se há novos bytes gravados
      if (stat.size > watcher.lastOffset) {
        const deltaBytes = stat.size - watcher.lastOffset;
        const buffer = Buffer.alloc(deltaBytes);

        const fd = fs.openSync(filePath, 'r');
        try {
          fs.readSync(fd, buffer, 0, deltaBytes, watcher.lastOffset);
        } finally {
          fs.closeSync(fd);
        }

        watcher.lastOffset = stat.size;
        watcher.lastMtimeMs = stat.mtimeMs;

        const rawText = watcher.partialLine + buffer.toString(encoding);
        const splitLines = rawText.split(/\r?\n/);

        // O último elemento pode ser uma linha incompleta ainda sem \n
        watcher.partialLine = splitLines.pop() || '';

        if (splitLines.length > 0) {
          onChunk({
            sourceId,
            filePath,
            lines: splitLines,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      // Ignora pequenos erros transitórios de EBUSY no Windows durante escrita concorrente
      if (err.code !== 'EBUSY') {
        console.warn(`[LogWatcherService] Erro ao verificar delta de ${filePath}:`, err.message);
      }
    }
  }

  /**
   * Para o monitoramento de uma fonte de log.
   */
  public stopWatch(sourceId: string): boolean {
    const watcher = this.watchers.get(sourceId);
    if (!watcher) return false;

    if (watcher.timer) {
      clearInterval(watcher.timer);
      watcher.timer = null;
    }

    if (watcher.fsWatcher) {
      try {
        watcher.fsWatcher.close();
      } catch {
        // Ignora
      }
      watcher.fsWatcher = null;
    }

    this.watchers.delete(sourceId);
    return true;
  }

  /**
   * Para todos os monitoramentos ativos.
   */
  public stopAll(): void {
    for (const sourceId of this.watchers.keys()) {
      this.stopWatch(sourceId);
    }
  }

  /**
   * Limpa (zera) o arquivo de log no disco.
   */
  public async clearLogFile(filePath: string): Promise<boolean> {
    if (!filePath || !isSafeLocalPath(filePath)) return false;

    try {
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', { flag: 'w' });

        // Ajusta watchers que apontam para este arquivo
        for (const watcher of this.watchers.values()) {
          if (path.resolve(watcher.filePath) === path.resolve(filePath)) {
            watcher.lastOffset = 0;
            watcher.partialLine = '';
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[LogWatcherService] Falha ao zerar arquivo ${filePath}:`, err);
      return false;
    }
  }
}
