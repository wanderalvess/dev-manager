import { spawn, execFile, SpawnOptionsWithoutStdio } from 'child_process';

export interface CapturedProcessResult {
  code: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

function killProcessTree(pid: number): void {
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
 * cada chunk para onChunk em tempo real. Compartilhado por Karaf/Docker/Deploy,
 * que antes reimplementavam este mesmo bloco de accumulate+resolve individualmente.
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
  timeoutMs?: number
): Promise<CapturedProcessResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { shell: false, ...options });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

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

    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      onChunk?.(text);
    });

    proc.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      onChunk?.(text);
    });

    proc.on('close', (code) => {
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
