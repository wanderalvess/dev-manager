import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './useCopyToClipboard';

function stubDocument(copyResult: boolean) {
  const textarea = { value: '', style: {}, focus: vi.fn(), select: vi.fn() };
  const execCommand = vi.fn(() => copyResult);
  vi.stubGlobal('document', {
    createElement: () => textarea,
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
    execCommand
  });
  return { textarea, execCommand };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyText', () => {
  it('usa o navigator.clipboard quando ele aceita', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { execCommand } = stubDocument(true);
    expect(await copyText('relatório')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('relatório');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('no Electron o clipboard é recusado e cai no execCommand', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) } });
    const { textarea, execCommand } = stubDocument(true);
    expect(await copyText('## Teste de bloqueio')).toBe(true);
    expect(textarea.value).toBe('## Teste de bloqueio');
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('diz que falhou quando nenhum dos dois copia', async () => {
    vi.stubGlobal('navigator', {});
    stubDocument(false);
    expect(await copyText('x')).toBe(false);
  });
});
