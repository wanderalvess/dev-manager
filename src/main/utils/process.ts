import { spawn, SpawnOptionsWithoutStdio } from 'child_process';

export interface CapturedProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Executa um comando via spawn (sem shell) acumulando stdout/stderr e repassando
 * cada chunk para onChunk em tempo real. Compartilhado por Karaf/Docker/Deploy,
 * que antes reimplementavam este mesmo bloco de accumulate+resolve individualmente.
 */
export function runCapturedProcess(
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio = {},
  onChunk?: (chunk: string) => void
): Promise<CapturedProcessResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { shell: false, ...options });
    let stdout = '';
    let stderr = '';

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
      resolve({ code: code || 0, stdout, stderr });
    });

    proc.on('error', (err) => {
      const errMsg = `[FALHA] ${err.message}\r\n`;
      onChunk?.(errMsg);
      resolve({ code: 1, stdout, stderr: errMsg });
    });
  });
}
