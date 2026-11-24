import { describe, expect, it } from 'vitest';
import {
  buildSessionId,
  evaluateChecks,
  formatHttpExchange,
  guessJiraKey,
  isValidEvidenceFileName,
  isValidSessionId,
  maskSecretHeaders,
  normalizeJiraKey,
  normalizeLinkUrl,
  parseCurlCommand,
  sanitizeLinks,
  slugifyTask,
  summarizeEvidence,
  type EvidenceStep
} from './evidenceTypes';

const step = (result: EvidenceStep['result']): EvidenceStep => ({ id: 'x', title: 't', result, createdAt: '' });

describe('evidenceTypes', () => {
  it('gera nomes de pasta seguros', () => {
    expect(slugifyTask('WT-123 / ajuste ção')).toBe('WT-123-ajuste-cao');
    expect(slugifyTask('../../etc')).toBe('etc');
    expect(slugifyTask('   ')).toBe('sem-tarefa');
  });

  it('monta e valida o id da sessão', () => {
    const id = buildSessionId('WT-9', new Date(2026, 0, 2, 3, 4, 5));
    expect(id).toBe('WT-9__20260102-030405');
    expect(isValidSessionId(id)).toBe(true);
    expect(isValidSessionId('../x__20260102-030405')).toBe(false);
    expect(isValidSessionId('a/b__20260102-030405')).toBe(false);
  });

  it('só aceita nomes de arquivo simples', () => {
    expect(isValidEvidenceFileName('step-01.png')).toBe(true);
    expect(isValidEvidenceFileName('..\\x.png')).toBe(false);
    expect(isValidEvidenceFileName('a..b')).toBe(false);
  });

  it('normaliza a chave do Jira', () => {
    expect(normalizeJiraKey(' wt-12 ')).toBe('WT-12');
    expect(normalizeJiraKey('12')).toBeNull();
    expect(normalizeJiraKey('WT-1/../x')).toBeNull();
    expect(guessJiraKey('ajuste wt-77 pdv')).toBe('WT-77');
    expect(guessJiraKey('sem chave')).toBe('');
  });

  it('resume o veredito', () => {
    expect(summarizeEvidence([]).verdict).toBe('pending');
    expect(summarizeEvidence([step('passed'), step('passed')]).verdict).toBe('passed');
    expect(summarizeEvidence([step('passed'), step('pending')]).verdict).toBe('pending');
    expect(summarizeEvidence([step('failed'), step('pending')]).verdict).toBe('failed');
  });
});

describe('maskSecretHeaders', () => {
  it('oculta credenciais em claro e mantém {{variáveis}}', () => {
    const out = maskSecretHeaders('Authorization: Bearer abcdef123456\nCookie: sid=zzzz9999\nAccept: application/json\nX-Api-Key: {{KEY}}');
    expect(out).toBe('Authorization: Bearer abcd…(oculto)\nCookie: sid=…(oculto)\nAccept: application/json\nX-Api-Key: {{KEY}}');
    expect(out).not.toContain('123456');
  });

  it('formatHttpExchange grava a requisição já mascarada', () => {
    const r = formatHttpExchange({ method: 'GET', url: 'http://h/a', headers: 'Authorization: Bearer segredo-longo', status: 200 });
    expect(r.request).toBe('GET http://h/a\nAuthorization: Bearer segr…(oculto)');
  });
});

describe('evaluateChecks', () => {
  it('"contem" procura o texto escrito na regra', () => {
    const v = evaluateChecks('contem idCargaInicial\ncontem qtdEnvioFalha', { response: '{"idCargaInicial":1,"qtdEnvioSucesso":2}' });
    expect(v?.results.map((r) => r.ok)).toEqual([true, false]);
    expect(v?.passed).toBe(false);
  });

  it('avisa quando a regra ficou com o "texto" de exemplo', () => {
    const v = evaluateChecks('contem texto', { response: '{"a":1}' });
    expect(v?.passed).toBe(false);
    expect(v?.results[0].detail).toContain('só um exemplo');
  });
});

describe('parseCurlCommand', () => {
  it('lê GET simples e ignora flags sem efeito', () => {
    expect(parseCurlCommand("curl -sSL --compressed 'http://h:1/a?x=1&y=2'")).toEqual({ method: 'GET', url: 'http://h:1/a?x=1&y=2', headers: '', body: '' });
  });

  it('lê cabeçalhos e corpo em várias linhas e infere POST', () => {
    const cmd = ["curl 'http://h/a' \\", "  -H 'Authorization: Bearer t' \\", "  -H 'Content-Type: application/json' \\", `  --data-raw '{"a":1}'`].join('\n');
    expect(parseCurlCommand(cmd)).toEqual({
      method: 'POST',
      url: 'http://h/a',
      headers: 'Authorization: Bearer t\nContent-Type: application/json',
      body: '{"a":1}'
    });
  });

  it('respeita -X e --url, e converte -u em Basic', () => {
    const r = parseCurlCommand('curl -X PUT --url http://h/a -u user:pass');
    expect(r?.method).toBe('PUT');
    expect(r?.url).toBe('http://h/a');
    expect(r?.headers).toBe('Authorization: Basic dXNlcjpwYXNz');
  });

  it('usa -G para mandar o corpo na query', () => {
    expect(parseCurlCommand("curl -G 'http://h/a?x=1' -d 'y=2'")).toMatchObject({ method: 'GET', url: 'http://h/a?x=1&y=2', body: '' });
  });

  it('desfaz o escape do "Copiar como cURL (cmd)"', () => {
    const cmd = ['curl ^"http://h/a^" ^', '  -H ^"Accept: application/json^"'].join('\n');
    expect(parseCurlCommand(cmd)).toEqual({ method: 'GET', url: 'http://h/a', headers: 'Accept: application/json', body: '' });
  });

  it('aceita "MÉTODO url" puro e rejeita texto qualquer', () => {
    expect(parseCurlCommand('GET http://h/a')?.url).toBe('http://h/a');
    expect(parseCurlCommand('qualquer coisa')).toBeNull();
    expect(parseCurlCommand('curl')).toBeNull();
  });
});

describe('links da evidência', () => {
  it('normalizeLinkUrl aceita só http(s), completa o https e protege a marcação do Jira', () => {
    expect(normalizeLinkUrl(' https://github.com/o/r/pull/1 ')).toBe('https://github.com/o/r/pull/1');
    expect(normalizeLinkUrl('github.com/o/r/pull/1')).toBe('https://github.com/o/r/pull/1');
    expect(normalizeLinkUrl('http://srv:8080/a|b[1]?x=[2]')).toBe('http://srv:8080/a%7Cb%5B1%5D?x=%5B2%5D');
    for (const bad of ['javascript:alert(1)', 'file:///c:/x', 'ftp://h/x', 'https://u:p@h/x', 'texto qualquer', '', '   ', 42]) {
      expect(normalizeLinkUrl(bad)).toBeNull();
    }
  });

  it('sanitizeLinks descarta inválidos, limita a quantidade e fixa o tipo', () => {
    let n = 0;
    const out = sanitizeLinks(
      [{ kind: 'pr', label: ' Versão\n1 ', url: 'github.com/a/b' }, { kind: 'zzz', url: 'https://x.com' }, { kind: 'api', url: 'javascript:1' }, null],
      () => `id${++n}`
    );
    expect(out).toEqual([
      { id: 'id1', kind: 'pr', label: 'Versão 1', url: 'https://github.com/a/b' },
      { id: 'id2', kind: 'other', url: 'https://x.com/' }
    ]);
    expect(sanitizeLinks(Array.from({ length: 50 }, () => ({ url: 'https://x.com' })), () => 'i')).toHaveLength(20);
    expect(sanitizeLinks('nada', () => 'i')).toEqual([]);
  });
});
