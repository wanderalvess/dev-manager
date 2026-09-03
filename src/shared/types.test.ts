import { describe, expect, it } from 'vitest';
import { getWebPort, getWebUrl, getKarafSshPort, detectIdeInfo } from './types';

describe('getWebPort', () => {
  it('usa settings.webPort quando definido', () => {
    expect(getWebPort({ webPort: 9090 } as any)).toBe(9090);
  });

  it('cai para a porta monitorada rotulada como Web/HTTP/Portal', () => {
    const port = getWebPort(undefined, [{ port: 7000, label: 'Portal Web Local', enabled: true }] as any);
    expect(port).toBe(7000);
  });

  it('ignora porta monitorada desabilitada', () => {
    const port = getWebPort(undefined, [{ port: 7000, label: 'Portal Web Local', enabled: false }] as any);
    expect(port).toBe(8889);
  });

  it('usa 8889 como último fallback', () => {
    expect(getWebPort(undefined, [])).toBe(8889);
  });
});

describe('getKarafSshPort', () => {
  it('usa settings.karafSshPort quando definido', () => {
    expect(getKarafSshPort({ karafSshPort: 8102 } as any)).toBe(8102);
  });

  it('cai para porta monitorada rotulada SSH', () => {
    const port = getKarafSshPort(undefined, [{ port: 8200, label: 'Karaf SSH (client.bat)', enabled: true }] as any);
    expect(port).toBe(8200);
  });

  it('usa 8101 como último fallback', () => {
    expect(getKarafSshPort(undefined, [])).toBe(8101);
  });
});

describe('getWebUrl', () => {
  it('monta URL com porta e path padrão', () => {
    expect(getWebUrl(undefined, '')).toBe('http://localhost:8889');
  });

  it('normaliza path sem barra inicial', () => {
    expect(getWebUrl({ webPort: 3000, webPath: 'painel' } as any)).toBe('http://localhost:3000/painel');
  });

  it('não duplica barra quando path já começa com /', () => {
    expect(getWebUrl({ webPort: 3000, webPath: '/painel' } as any)).toBe('http://localhost:3000/painel');
  });
});

describe('detectIdeInfo', () => {
  it('sem caminho nem nome customizado retorna IDE genérica', () => {
    const info = detectIdeInfo();
    expect(info.iconType).toBe('code');
    expect(info.name).toBe('IDE / Editor');
  });

  it('detecta IntelliJ pelo caminho do executável', () => {
    const info = detectIdeInfo('C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin\\idea64.exe');
    expect(info.iconType).toBe('intellij');
    expect(info.exeName).toBe('idea64.exe');
  });

  it('detecta VS Code pelo nome do executável', () => {
    const info = detectIdeInfo('C:\\Program Files\\Microsoft VS Code\\Code.exe');
    expect(info.iconType).toBe('vscode');
  });

  it('detecta Cursor pelo nome do executável', () => {
    const info = detectIdeInfo('C:\\Users\\dev\\AppData\\Local\\Programs\\cursor\\Cursor.exe');
    expect(info.iconType).toBe('cursor');
  });

  it('nome customizado tem prioridade sobre o caminho', () => {
    const info = detectIdeInfo('C:\\Program Files\\Microsoft VS Code\\Code.exe', 'Minha IDE Cursor');
    expect(info.iconType).toBe('cursor');
    expect(info.name).toBe('Minha IDE Cursor');
  });

  it('trunca nome customizado longo em shortName', () => {
    const info = detectIdeInfo(undefined, 'Editor de Codigo Personalizado Bem Longo');
    expect(info.shortName.length).toBeLessThanOrEqual(15);
    expect(info.shortName.endsWith('...')).toBe(true);
  });
});
