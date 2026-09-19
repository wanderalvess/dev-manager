import { describe, expect, it } from 'vitest';
import process from 'node:process';
import { runCapturedProcess, createStreamDecoder } from './process';
import iconv from 'iconv-lite';

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

  it('executa cmd.exe no Windows sem erro de spawn ENOENT', async () => {
    if (process.platform !== 'win32') return;
    const result = await runCapturedProcess('cmd.exe', ['/c', 'echo', 'teste-cmd']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('teste-cmd');
  });
});

describe('createStreamDecoder', () => {
  it('decodifica UTF-8 com acentos em português perfeitamente', () => {
    const decoder = createStreamDecoder();
    const original = 'Funcionalidades de Venda — Atenção: Compilação concluída com sucesso!';
    const buf = Buffer.from(original, 'utf-8');
    const result = decoder.write(buf) + decoder.flush();
    expect(result).toBe(original);
  });

  it('remonta sequências UTF-8 multi-byte fatiadas na borda do buffer', () => {
    const decoder = createStreamDecoder();
    const original = 'Atenção e Configurações';
    const buf = Buffer.from(original, 'utf-8');

    // Fatia no meio do caractere 'ç' (0xC3 0xA7)
    const splitIndex = buf.indexOf(Buffer.from('ç', 'utf-8')) + 1;
    const chunk1 = buf.subarray(0, splitIndex);
    const chunk2 = buf.subarray(splitIndex);

    const part1 = decoder.write(chunk1);
    const part2 = decoder.write(chunk2);
    const result = part1 + part2 + decoder.flush();

    expect(result).toBe(original);
    expect(result).not.toContain('\uFFFD');
  });

  it('decodifica saída legada em CP850 (OEM Windows Brasil) sem corromper acentos', () => {
    const decoder = createStreamDecoder();
    const original = 'Atenção: Acesso negado ao diretório de compilação';
    const cp850Buffer = iconv.encode(original, 'cp850');

    const result = decoder.write(cp850Buffer) + decoder.flush();
    expect(result).toBe(original);
    expect(result).not.toContain('\uFFFD');
  });

  it('decodifica saída em Windows-1252 (ANSI)', () => {
    const decoder = createStreamDecoder();
    const original = 'Instalação de módulos';
    const win1252Buffer = iconv.encode(original, 'windows-1252');

    const result = decoder.write(win1252Buffer) + decoder.flush();
    expect(result).toBe(original);
    expect(result).not.toContain('\uFFFD');
  });
});
