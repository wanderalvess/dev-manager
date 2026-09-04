import { describe, expect, it } from 'vitest';
import process from 'node:process';
import { runCapturedProcess } from './process';

describe('runCapturedProcess', () => {
  it('resolve normalmente com stdout/stderr acumulados e onChunk chamado', async () => {
    const chunks: string[] = [];
    const result = await runCapturedProcess(
      process.execPath,
      ['-e', "process.stdout.write('ola'); process.stderr.write('erro')"],
      {},
      (chunk) => chunks.push(chunk)
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('ola');
    expect(result.stderr).toBe('erro');
    expect(result.timedOut).toBeUndefined();
    expect(chunks.join('')).toBe('olaerro');
  });

  it('repassa o código de saída de um processo com falha', async () => {
    const result = await runCapturedProcess(process.execPath, ['-e', 'process.exit(3)']);
    expect(result.code).toBe(3);
    expect(result.timedOut).toBeUndefined();
  });

  it('resolve com erro quando o comando não existe (sem travar o chamador)', async () => {
    const result = await runCapturedProcess('comando-que-nao-existe-xyz', []);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/FALHA/);
  });

  it('mata a árvore de processos e marca timedOut quando excede timeoutMs', async () => {
    const start = Date.now();
    const result = await runCapturedProcess(
      process.execPath,
      ['-e', 'setTimeout(() => {}, 10000)'],
      {},
      undefined,
      300
    );
    const elapsed = Date.now() - start;

    expect(result.timedOut).toBe(true);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/timeout/i);
    // Deve ter sido morto bem antes do setTimeout de 10s completar naturalmente.
    expect(elapsed).toBeLessThan(9000);
  }, 15000);

  it('não deixa o timer de timeout pendente quando o processo termina antes', async () => {
    const result = await runCapturedProcess(
      process.execPath,
      ['-e', "process.stdout.write('rapido')"],
      {},
      undefined,
      5000
    );

    expect(result.timedOut).toBeUndefined();
    expect(result.stdout).toBe('rapido');
  });
});
