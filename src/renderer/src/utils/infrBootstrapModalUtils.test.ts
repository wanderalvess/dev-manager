import { describe, expect, it } from 'vitest';
import {
  infrBootstrapModalParsePort,
  infrBootstrapModalPreviewCommand,
  infrCheckBadge,
  infrContainerStateText,
  infrFolderStatus,
  infrImageVersion,
  INFR_VIEW_TITLE
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

  it('toda tela tem nome no cabeçalho', () => {
    expect(Object.keys(INFR_VIEW_TITLE).sort()).toEqual(['firstSteps', 'home', 'newVersion', 'oracle', 'scripts', 'verify', 'wsh', 'wta']);
    expect(Object.values(INFR_VIEW_TITLE).every((t) => t.length > 3)).toBe(true);
  });

  it('estado do container em palavras', () => {
    expect(infrContainerStateText(undefined)).toBe('não tem');
    expect(infrContainerStateText({ state: 'running' })).toBe('no ar');
    expect(infrContainerStateText({ state: 'exited' })).toBe('parado');
    expect(infrContainerStateText({ state: 'dead' })).toBe('dead');
    expect(infrContainerStateText({ state: '' })).toBe('estado desconhecido');
  });

  it('selo do container no Verificar', () => {
    expect(infrCheckBadge({ exists: false })).toEqual({ text: 'não criado', tone: 'none' });
    expect(infrCheckBadge({ exists: true, state: 'running' })).toEqual({ text: 'no ar', tone: 'up' });
    expect(infrCheckBadge({ exists: true, state: 'running', health: 'healthy' })).toEqual({ text: 'no ar · healthy', tone: 'up' });
    expect(infrCheckBadge({ exists: true, state: 'running', health: 'starting' }).tone).toBe('wait');
    expect(infrCheckBadge({ exists: true, state: 'running', health: 'unhealthy' }).tone).toBe('down');
    expect(infrCheckBadge({ exists: true, state: 'restarting' }).tone).toBe('wait');
    expect(infrCheckBadge({ exists: true, state: 'exited' })).toEqual({ text: 'exited', tone: 'down' });
  });

  it('versão pela imagem do WTA', () => {
    expect(infrImageVersion('linux-winthor:40-debian')).toBe('40');
    expect(infrImageVersion('linux-winthor:38')).toBe('38');
    expect(infrImageVersion('linux-winthor:latest')).toBeUndefined();
    expect(infrImageVersion(undefined)).toBeUndefined();
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
