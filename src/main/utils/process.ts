import { spawn, execFile, SpawnOptionsWithoutStdio, ChildProcess } from 'child_process';
import path from 'path';
import iconv from 'iconv-lite';

export interface CapturedProcessResult {
  code: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

export interface StreamDecoder {
  write(chunk: Buffer): string;
  flush(): string;
}

/**
 * Cria um decodificador de stream de processos resiliente a encodings mistos.
 * Detecta e decodifica UTF-8 (inclusive com caracteres multi-byte fatiados na borda do buffer)
 * e faz fallback automático para CP850 (OEM padrão do prompt de comando Windows no Brasil)
 * ou Windows-1252 quando encontra bytes fora do padrão UTF-8.
 */
export function createStreamDecoder(): StreamDecoder {
  let detectedEncoding: 'utf-8' | 'cp850' | 'windows-1252' | null = null;
  let partialBuffer: Buffer = Buffer.alloc(0);

  return {
    write(chunk: Buffer): string {
      if (!chunk || chunk.length === 0) return '';
      const buffer = partialBuffer.length > 0 ? Buffer.concat([partialBuffer, chunk]) : chunk;

      if (detectedEncoding && detectedEncoding !== 'utf-8') {
        partialBuffer = Buffer.alloc(0);
        return iconv.decode(buffer, detectedEncoding);
      }

      // Procura por corte de sequência UTF-8 nos últimos 1 a 3 bytes
      let safeLength = buffer.length;
      for (let i = Math.max(0, buffer.length - 4); i < buffer.length; i++) {
        const b = buffer[i];
        if ((b & 0xE0) === 0xC0 && buffer.length - i < 2) {
          safeLength = i;
          break;
        } else if ((b & 0xF0) === 0xE0 && buffer.length - i < 3) {
          safeLength = i;
          break;
        } else if ((b & 0xF8) === 0xF0 && buffer.length - i < 4) {
          safeLength = i;
          break;
        }
      }

      const toProcess = buffer.slice(0, safeLength);
      partialBuffer = buffer.slice(safeLength);

      if (toProcess.length === 0) {
        return '';
      }

      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(toProcess);
        detectedEncoding = 'utf-8';
        return text;
      } catch {
        // Sequência inválida em UTF-8 detectada (comum em cmd.exe/batch no Windows com CP850 ou Windows-1252)
        const full = buffer;
        partialBuffer = Buffer.alloc(0);

        let cp850Hits = 0;
        let win1252Hits = 0;
        for (let i = 0; i < full.length; i++) {
          const b = full[i];
          // Bytes comuns em CP850: 0x87=ç, 0xC6=ã, 0x82=é, 0xA0=á, 0xA2=ó, 0xA3=ú, 0x88=ê
          if (b === 0x87 || b === 0xC6 || b === 0x82 || b === 0xA0 || b === 0xA2 || b === 0xA3 || b === 0x88) cp850Hits++;
          // Bytes comuns em Windows-1252: 0xE7=ç, 0xE3=ã, 0xE9=é, 0xE1=á, 0xF3=ó, 0xFA=ú, 0xEA=ê, 0xF5=õ
          if (b === 0xE7 || b === 0xE3 || b === 0xE9 || b === 0xE1 || b === 0xF3 || b === 0xFA || b === 0xEA) win1252Hits++;
        }

        detectedEncoding = cp850Hits >= win1252Hits ? 'cp850' : 'windows-1252';
        return iconv.decode(full, detectedEncoding);
      }
    },

    flush(): string {
      if (partialBuffer.length === 0) return '';
      const leftover = partialBuffer;
      partialBuffer = Buffer.alloc(0);
      try {
        return new TextDecoder('utf-8', { fatal: false }).decode(leftover);
      } catch {
        return iconv.decode(leftover, detectedEncoding || 'cp850');
      }
    }
  };
}

export function killProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    execFile('taskkill.exe', ['/F', '/T', '/PID', String(pid)], () => {});
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      // grupo pode já ter encerrado
    }
  }
}

/**
 * Executa um comando via spawn (sem shell) acumulando stdout/stderr e repassando
 * cada chunk para onChunk em tempo real com decodificação inteligente de encoding.
 * Compartilhado por Karaf/Docker/Deploy, que antes reimplementavam este mesmo bloco
 * de accumulate+resolve individualmente.
 *
 * `timeoutMs`, se informado, mata a árvore de processos (taskkill /T no Windows)
 * caso o comando não termine a tempo — evita processos órfãos (ex: build Maven
 * travado) acumulando em máquinas já sobrecarregadas com vários fluxos abertos.
 */
export function runCapturedProcess(
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio = {},
  onChunk?: (chunk: string) => void,
  timeoutMs?: number,
  onSpawn?: (child: ChildProcess) => void
): Promise<CapturedProcessResult> {
  return new Promise((resolve) => {
    let resolvedCommand = command;
    const finalOptions: SpawnOptionsWithoutStdio = {
      shell: false,
      detached: process.platform !== 'win32',
      ...options
    };

    if (process.platform === 'win32') {
      const lower = command.toLowerCase();
      if (lower === 'cmd.exe' || lower === 'cmd') {
        resolvedCommand = process.env.ComSpec || process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
      }
      if (finalOptions.env) {
        if (!finalOptions.env.SystemRoot) {
          finalOptions.env.SystemRoot = process.env.SystemRoot || 'C:\\Windows';
        }
        if (!finalOptions.env.ComSpec) {
          finalOptions.env.ComSpec = process.env.ComSpec || process.env.COMSPEC || path.join(finalOptions.env.SystemRoot, 'System32', 'cmd.exe');
        }
        if (!finalOptions.env.PYTHONIOENCODING) {
          finalOptions.env.PYTHONIOENCODING = 'utf-8';
        }
      }
    }

    // detached no POSIX torna o filho líder do próprio grupo de processos, o que é
    // exigido por killProcessTree para poder matar o grupo inteiro via `kill(-pid)`
    // (sem isso o filho herda o grupo deste processo Node e o kill não acha nada pra matar).
    const proc = spawn(resolvedCommand, args, finalOptions);
    if (onSpawn) onSpawn(proc);
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const stdoutDecoder = createStreamDecoder();
    const stderrDecoder = createStreamDecoder();

    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          if (proc.pid) killProcessTree(proc.pid);
        }, timeoutMs)
      : undefined;

    const settle = (result: CapturedProcessResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    proc.stdout?.on('data', (data: Buffer) => {
      const text = stdoutDecoder.write(data);
      if (text) {
        stdout += text;
        onChunk?.(text);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = stderrDecoder.write(data);
      if (text) {
        stderr += text;
        onChunk?.(text);
      }
    });

    proc.on('close', (code) => {
      const restOut = stdoutDecoder.flush();
      if (restOut) {
        stdout += restOut;
        onChunk?.(restOut);
      }
      const restErr = stderrDecoder.flush();
      if (restErr) {
        stderr += restErr;
        onChunk?.(restErr);
      }

      if (timedOut) {
        const msg = `[FALHA] Processo encerrado por timeout (${timeoutMs}ms)\r\n`;
        onChunk?.(msg);
        settle({ code: code || 1, stdout, stderr: stderr + msg, timedOut: true });
        return;
      }
      settle({ code: code || 0, stdout, stderr });
    });

    proc.on('error', (err) => {
      const errMsg = `[FALHA] ${err.message}\r\n`;
      onChunk?.(errMsg);
      settle({ code: 1, stdout, stderr: errMsg });
    });
  });
}
