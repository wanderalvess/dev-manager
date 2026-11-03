import { describe, expect, it } from 'vitest';
import { commandFailureDetail, missingNewVersionScriptsMessage } from './infrNewVersionScripts';

describe('infrNewVersionScripts', () => {
  it('mensagem de scripts faltando nomeia os arquivos e o branch', () => {
    const msg = missingNewVersionScriptsMessage('C:\\projetos\\INFR-Docker', ['linux-winthor/scripts/export_features.sh']);
    expect(msg).toContain('C:\\projetos\\INFR-Docker');
    expect(msg).toContain('(export_features.sh)');
    expect(msg).toContain('Como resolver');
    expect(msg).toContain('git checkout feature/imagem-por-versao');
  });

  it('detalhe da falha usa as últimas linhas do stderr/stdout, sem cores', () => {
    const err = { message: 'Command failed: wsl.exe ...', stdout: 'linha 1\n\x1b[31m[ERRO] Karaf fora do ar\x1b[0m\n', stderr: '' };
    expect(commandFailureDetail(err)).toBe('linha 1 · [ERRO] Karaf fora do ar');
    const long = { stderr: Array.from({ length: 10 }, (_, i) => `l${i}`).join('\n') };
    expect(commandFailureDetail(long, 2)).toBe('l8 · l9');
  });

  it('tira os bytes nulos de um UTF-16 lido como UTF-8, em vez de mostrar quadrados', () => {
    const embaralhado = 'F\u0000a\u0000l\u0000h\u0000a\u0000 \u0000a\u0000o\u0000 \u0000i\u0000n\u0000i\u0000c\u0000i\u0000a\u0000r\u0000\r\n\u0000';
    expect(commandFailureDetail({ stdout: embaralhado })).toBe('Falha ao iniciar');
  });

  it('sem saída, cai na mensagem do erro', () => {
    expect(commandFailureDetail(new Error('timeout'))).toBe('timeout');
    expect(commandFailureDetail('falhou')).toBe('falhou');
  });
});
