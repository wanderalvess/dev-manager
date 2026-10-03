import { describe, it, expect } from 'vitest';
import { parseTnsNamesContent, stripTnsComments } from './tnsnamesParser';

describe('tnsnamesParser', () => {
  it('remove comentários iniciados por #', () => {
    const raw = `
      # Comentário de cabeçalho
      XE = (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = localhost)(PORT = 1521))) # inline comment
    `;
    const clean = stripTnsComments(raw);
    expect(clean).not.toContain('Comentário de cabeçalho');
    expect(clean).not.toContain('inline comment');
    expect(clean).toContain('XE =');
  });

  it('faz parse de entrada padrão com SERVICE_NAME', () => {
    const ora = `
      # tnsnames.ora Network Configuration File
      XEPDB1 =
        (DESCRIPTION =
          (ADDRESS = (PROTOCOL = TCP)(HOST = 127.0.0.1)(PORT = 1521))
          (CONNECT_DATA =
            (SERVER = DEDICATED)
            (SERVICE_NAME = XEPDB1)
          )
        )
    `;

    const entries = parseTnsNamesContent(ora);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      alias: 'XEPDB1',
      host: '127.0.0.1',
      port: 1521,
      serviceName: 'XEPDB1',
      sid: undefined,
      oracleMode: 'serviceName',
      protocol: 'TCP',
      server: 'DEDICATED'
    });
  });

  it('faz parse de entrada legada com SID', () => {
    const ora = `
      WINTHOR11 =
        (DESCRIPTION =
          (ADDRESS_LIST =
            (ADDRESS = (PROTOCOL = TCP)(HOST = srv-oracle-11g)(PORT = 1522))
          )
          (CONNECT_DATA =
            (SID = WINT11)
          )
        )
    `;

    const entries = parseTnsNamesContent(ora);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      alias: 'WINTHOR11',
      host: 'srv-oracle-11g',
      port: 1522,
      serviceName: undefined,
      sid: 'WINT11',
      oracleMode: 'sid',
      protocol: 'TCP',
      server: undefined
    });
  });

  it('suporta múltiplos aliases na mesma definição e ignora IPC/EXTPROC', () => {
    const ora = `
      ORACLR_CONNECTION_DATA =
        (DESCRIPTION =
          (ADDRESS_LIST =
            (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC11))
          )
          (CONNECT_DATA =
            (SID = CLRExtProc)
          )
        )

      PROD, PROD.WORLD =
        (DESCRIPTION =
          (ADDRESS = (PROTOCOL = TCP)(HOST = 192.168.1.100)(PORT = 1521))
          (CONNECT_DATA =
            (SERVICE_NAME = proderp)
          )
        )
    `;

    const entries = parseTnsNamesContent(ora);
    // Deve ignorar IPC EXTPROC sem host e listar PROD e PROD.WORLD
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.alias)).toEqual(['PROD', 'PROD.WORLD']);
    expect(entries[0].host).toBe('192.168.1.100');
    expect(entries[0].serviceName).toBe('proderp');
  });

  it('retorna array vazio para conteúdo vazio ou inválido', () => {
    expect(parseTnsNamesContent('')).toEqual([]);
    expect(parseTnsNamesContent('# Só comentários aqui\n# outra linha')).toEqual([]);
    expect(parseTnsNamesContent('invalido sem parenteses')).toEqual([]);
  });
});
