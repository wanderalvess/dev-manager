import { describe, expect, it } from 'vitest';
import {
  infrBootstrapModalParsePort,
  infrBootstrapModalPreviewCommand,
  infrFolderStatus,
  INFR_ASSISTANT_NAV
} from './infrBootstrapModalUtils';

describe('infrBootstrapModalUtils', () => {
  it('usa o padrão quando a porta é vazia ou inválida', () => {
    expect(infrBootstrapModalParsePort('', 1521)).toBe(1521);
    expect(infrBootstrapModalParsePort('abc', 8080)).toBe(8080);
    expect(infrBootstrapModalParsePort('0', 8080)).toBe(8080);
    expect(infrBootstrapModalParsePort('1522', 1521)).toBe(1522);
  });

  it('monta a prévia com fallback de container e porta', () => {
    expect(infrBootstrapModalPreviewCommand('oracle_setup.sh', '', 0, 'oracle-winthor', 1521)).toBe(
      './oracle_setup.sh --container oracle-winthor --port 1521'
    );
    expect(infrBootstrapModalPreviewCommand('wta_setup.sh', 'x', 9090, 'linux-winthor', 8080)).toBe(
      './wta_setup.sh --container x --port 9090'
    );
  });

  it('navegação cobre cada aba uma vez, com o que ela faz', () => {
    const items = INFR_ASSISTANT_NAV.flatMap((g) => g.items);
    expect(items.map((i) => i.tab).sort()).toEqual(['newVersion', 'oracle', 'scripts', 'wsh', 'wta']);
    expect(items.every((i) => i.hint.length > 10)).toBe(true);
  });

  it('pasta do INFR-Docker: a digitada vence a detectada; faltando script não está ok', () => {
    const scripts = [
      { path: 'C:\\Users\\a\\Projetos\\INFR-Docker\\oracle-winthor\\oracle_setup.sh', exists: true },
      { path: 'C:\\Users\\a\\Projetos\\INFR-Docker\\wsh-winthor\\wsh_setup.sh', exists: false }
    ];
    expect(infrFolderStatus('', scripts)).toEqual({ folder: 'C:\\Users\\a\\Projetos\\INFR-Docker', ok: false, missing: 1 });
    expect(infrFolderStatus(' D:\\Projeto\\INFR-Docker ', [{ ...scripts[0] }])).toEqual({ folder: 'D:\\Projeto\\INFR-Docker', ok: true, missing: 0 });
    expect(infrFolderStatus('', [])).toEqual({ folder: '', ok: false, missing: 0 });
  });
});
