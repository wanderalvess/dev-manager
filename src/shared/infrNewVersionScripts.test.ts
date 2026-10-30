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

  it('sem saída, cai na mensagem do erro', () => {
    expect(commandFailureDetail(new Error('timeout'))).toBe('timeout');
    expect(commandFailureDetail('falhou')).toBe('falhou');
  });
});
