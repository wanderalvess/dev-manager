import { describe, expect, it } from 'vitest';
import {
  isValidIdentifier,
  isValidSqlIdentifier,
  isValidSqlTableName,
  isSafeUrl,
  isSafeKarafCommand,
  isSafeLocalPath,
  isSafePath,
  isLoopbackAddress
} from './security';

describe('isLoopbackAddress', () => {
  it('aceita loopback IPv4, IPv6 e IPv4 mapeado em IPv6', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('127.10.0.3')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
  });

  it('rejeita endereços de rede e valores ausentes ou forjados', () => {
    expect(isLoopbackAddress('192.168.0.10')).toBe(false);
    expect(isLoopbackAddress('::ffff:10.0.0.5')).toBe(false);
    expect(isLoopbackAddress('0.0.0.0')).toBe(false);
    expect(isLoopbackAddress('127.0.0.1.evil.com')).toBe(false);
    expect(isLoopbackAddress(undefined)).toBe(false);
    expect(isLoopbackAddress('')).toBe(false);
  });
});

describe('isValidIdentifier', () => {
  it('aceita nomes de serviço/processo comuns', () => {
    expect(isValidIdentifier('MyService.exe')).toBe(true);
    expect(isValidIdentifier('Print Spooler')).toBe(true);
    expect(isValidIdentifier('some-service_1.0')).toBe(true);
  });

  it('rejeita metacaracteres de shell e valores vazios', () => {
    expect(isValidIdentifier('')).toBe(false);
    expect(isValidIdentifier('svc && calc.exe')).toBe(false);
    expect(isValidIdentifier('svc; rm -rf /')).toBe(false);
    expect(isValidIdentifier('svc\n2')).toBe(false);
    expect(isValidIdentifier('svc|pipe')).toBe(false);
    expect(isValidIdentifier(undefined as unknown as string)).toBe(false);
  });
});

describe('isValidSqlIdentifier', () => {
  it('aceita nomes de coluna comuns, incluindo $ do Oracle', () => {
    expect(isValidSqlIdentifier('CODPROD')).toBe(true);
    expect(isValidSqlIdentifier('user_id')).toBe(true);
    expect(isValidSqlIdentifier('COL$1')).toBe(true);
    expect(isValidSqlIdentifier('_private')).toBe(true);
  });

  it('rejeita espaços, ponto, aspas e tentativas de injection', () => {
    expect(isValidSqlIdentifier('')).toBe(false);
    expect(isValidSqlIdentifier('col name')).toBe(false);
    expect(isValidSqlIdentifier('schema.tabela')).toBe(false);
    expect(isValidSqlIdentifier("col; DROP TABLE x --")).toBe(false);
    expect(isValidSqlIdentifier("col' OR '1'='1")).toBe(false);
    expect(isValidSqlIdentifier('1col')).toBe(false);
    expect(isValidSqlIdentifier(undefined as unknown as string)).toBe(false);
  });
});

describe('isValidSqlTableName', () => {
  it('aceita nome simples e schema.tabela', () => {
    expect(isValidSqlTableName('CLIENTES')).toBe(true);
    expect(isValidSqlTableName('public.clientes')).toBe(true);
  });

  it('rejeita mais de um ponto e metacaracteres SQL', () => {
    expect(isValidSqlTableName('a.b.c')).toBe(false);
    expect(isValidSqlTableName('tabela; DROP TABLE x')).toBe(false);
    expect(isValidSqlTableName('tabela--')).toBe(false);
    expect(isValidSqlTableName('')).toBe(false);
  });
});

describe('isSafeUrl', () => {
  it('aceita apenas http/https', () => {
    expect(isSafeUrl('https://dev.azure.com/org/project')).toBe(true);
    expect(isSafeUrl('http://localhost:8889')).toBe(true);
  });

  it('rejeita outros esquemas e entradas inválidas', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeUrl('not a url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
  });
});

describe('isSafeKarafCommand', () => {
  it('aceita comandos Karaf simples', () => {
    expect(isSafeKarafCommand('feature:list -i')).toBe(true);
    expect(isSafeKarafCommand('bundle:list -s')).toBe(true);
  });

  it('bloqueia encadeamento de shell e quebras de linha', () => {
    expect(isSafeKarafCommand('log:clear; rm -rf /')).toBe(false);
    expect(isSafeKarafCommand('log:clear\nshutdown')).toBe(false);
    expect(isSafeKarafCommand('a && b')).toBe(false);
    expect(isSafeKarafCommand('a | b')).toBe(false);
    expect(isSafeKarafCommand('a `whoami`')).toBe(false);
    expect(isSafeKarafCommand('a $(whoami)')).toBe(false);
    expect(isSafeKarafCommand('')).toBe(false);
    expect(isSafeKarafCommand('a'.repeat(1001))).toBe(false);
  });
});

describe('isSafeLocalPath', () => {
  it('aceita caminhos locais comuns', () => {
    expect(isSafeLocalPath('C:/projects/app')).toBe(true);
    expect(isSafeLocalPath('/workspace/projects/app')).toBe(true);
  });

  it('rejeita caminhos UNC de rede e bytes nulos', () => {
    expect(isSafeLocalPath('\\\\server\\share')).toBe(false);
    expect(isSafeLocalPath('//server/share')).toBe(false);
    expect(isSafeLocalPath('C:/foo\0bar')).toBe(false);
    expect(isSafeLocalPath('')).toBe(false);
  });
});

describe('isSafePath', () => {
  it('rejeita caminhos fora do diretório base permitido', () => {
    expect(isSafePath('C:/other/place', 'C:/workspace/projects')).toBe(false);
  });

  it('aceita caminhos dentro do diretório base permitido', () => {
    expect(isSafePath('C:/workspace/projects/app', 'C:/workspace/projects')).toBe(true);
  });

  it('aceita o próprio diretório base', () => {
    expect(isSafePath('C:/workspace/projects', 'C:/workspace/projects')).toBe(true);
  });

  it('rejeita diretório irmão cujo nome apenas começa com o prefixo do base (sem separador)', () => {
    // Regressão: startsWith() puro deixava "projects-evil" passar como se estivesse
    // dentro de "projects", por ser um prefixo textual válido.
    expect(isSafePath('C:/workspace/projects-evil/payload.exe', 'C:/workspace/projects')).toBe(false);
    expect(isSafePath('C:/workspace/projectsevil', 'C:/workspace/projects')).toBe(false);
  });
});
