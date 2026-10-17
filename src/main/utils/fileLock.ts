import fs from 'fs';

export interface FileLockOptions {
  /** Quanto esperar pelo lock antes de desistir. */
  timeoutMs?: number;
  /** Intervalo entre tentativas. */
  retryMs?: number;
  /** Um lock mais velho que isso é de um processo que morreu no meio da escrita. */
  staleMs?: number;
}

const DEFAULTS: Required<FileLockOptions> = { timeoutMs: 2000, retryMs: 25, staleMs: 10_000 };

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Exclusão mútua entre processos por arquivo de lock (`open` com flag `wx`, que falha se já existe).
 * Síncrono de propósito: é usado em caminhos que precisam terminar até na saída do processo.
 *
 * Executa `fn` com o lock e devolve `true`. Devolve `false` se não conseguiu o lock a tempo ou se
 * `fn` lançou — o chamador mantém o que tinha e tenta de novo depois.
 *
 * Um lock vencido é removido por quem o encontra. Se dois processos fizerem isso ao mesmo tempo,
 * um deles pode apagar o lock recém-criado do outro; é raro, e o pior caso é duas escritas
 * concorrentes (quem escreve deve usar rename atômico para o arquivo seguir íntegro).
 */
export function withFileLock(lockPath: string, fn: () => void, options: FileLockOptions = {}): boolean {
  const { timeoutMs, retryMs, staleMs } = { ...DEFAULTS, ...options };
  const fd = acquire(lockPath, timeoutMs, retryMs, staleMs);
  if (fd === null) return false;
  try {
    fn();
    return true;
  } catch (err) {
    console.warn('[fileLock] Falha dentro do lock:', err);
    return false;
  } finally {
    try {
      fs.closeSync(fd);
      fs.unlinkSync(lockPath);
    } catch {
      /* lock já removido */
    }
  }
}

function acquire(lockPath: string, timeoutMs: number, retryMs: number, staleMs: number): number | null {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return fs.openSync(lockPath, 'wx');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') return null;
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > staleMs) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch {
        continue; // o lock sumiu entre o open e o stat: tenta de novo
      }
      if (Date.now() >= deadline) return null;
      sleepSync(retryMs);
    }
  }
}
