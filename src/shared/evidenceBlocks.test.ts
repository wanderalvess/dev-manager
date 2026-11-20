import { describe, expect, it } from 'vitest';
import {
  describeAction,
  escapeSendKeys,
  evaluateChecks,
  sanitizeActions,
  formatHttpExchange,
  formatQueryTable,
  groupBlocks,
  isReadOnlySql,
  parseHttpRequestText,
  type EvidenceBlock
} from './evidenceTypes';

const block = (id: string, phase: EvidenceBlock['phase']): EvidenceBlock => ({ id, kind: 'api', phase, createdAt: '2026-01-01T00:00:00.000Z' });

describe('isReadOnlySql', () => {
  it('aceita SELECT e WITH, com comentários e ponto e vírgula final', () => {
    expect(isReadOnlySql('select * from pcpedc where numped = 1;')).toBe(true);
    expect(isReadOnlySql('-- consulta\nWITH a AS (SELECT 1 FROM dual) SELECT * FROM a')).toBe(true);
  });

  it('recusa comandos que alteram dados ou várias instruções', () => {
    expect(isReadOnlySql('delete from pcpedc')).toBe(false);
    expect(isReadOnlySql('select 1 from dual; drop table x')).toBe(false);
    expect(isReadOnlySql('select * from t where a = 1 and exec = 2 or update_x = 3')).toBe(false);
  });

  it('não confunde palavra reservada dentro de texto literal', () => {
    expect(isReadOnlySql("select * from t where obs = 'delete me'")).toBe(true);
  });
});

describe('formatQueryTable', () => {
  it('alinha colunas e trata nulos', () => {
    const out = formatQueryTable(['ID', 'NOME'], [{ ID: 1, NOME: 'Ana' }, { ID: 22, NOME: null }]);
    expect(out.split('\n')).toEqual(['ID | NOME', '---+-----', '1  | Ana', '22 | NULL']);
  });

  it('informa resultado vazio e truncamento', () => {
    expect(formatQueryTable(['A'], [])).toBe('(nenhuma linha)');
    expect(formatQueryTable(['A'], [{ A: 1 }], true)).toContain('limitado');
  });
});

describe('formatHttpExchange / parseHttpRequestText', () => {
  it('formata a chamada e o resumo', () => {
    const out = formatHttpExchange({
      method: 'POST',
      url: 'http://x/api',
      headers: 'Content-Type: application/json',
      body: '{"a":1}',
      status: 201,
      statusText: 'Created',
      durationMs: 12,
      sizeBytes: 2048,
      responseBody: '{"ok":true}'
    });
    expect(out.meta).toBe('201 Created · 12 ms · 2.0 KB');
    expect(out.response).toBe('{\n  "ok": true\n}');
    expect(parseHttpRequestText(out.request)).toEqual({
      method: 'POST',
      url: 'http://x/api',
      headers: 'Content-Type: application/json',
      body: '{\n  "a": 1\n}'
    });
  });

  it('marca falha de rede e lê requisição sem cabeçalhos', () => {
    expect(formatHttpExchange({ method: 'GET', url: 'http://x', error: 'ECONNREFUSED' }).meta).toBe('Falha na requisição');
    expect(parseHttpRequestText('GET http://x/a?b=1')).toEqual({ method: 'GET', url: 'http://x/a?b=1', headers: '', body: '' });
    expect(parseHttpRequestText('isto não é requisição')).toBeNull();
  });
});

describe('roteiro de ações', () => {
  const ids = () => 'gen-id';

  it('sanitiza ações: descarta inválidas, limita valores e só aceita teclas da lista', () => {
    const out = sanitizeActions(
      [
        { type: 'click', x: 10.4, y: 99999999, button: 'right' },
        { type: 'click', x: 'a', y: 1 },
        { type: 'type', text: 'x'.repeat(900) },
        { type: 'type', text: '' },
        { type: 'key', key: 'Enter' },
        { type: 'key', key: 'Ctrl+Alt+Del' },
        { type: 'wait', ms: -5 },
        { type: 'format-c' },
        null
      ],
      ids
    );
    expect(out.map((a) => a.type)).toEqual(['click', 'type', 'key', 'wait']);
    expect(out[0]).toMatchObject({ x: 10, y: 20000, button: 'right' });
    expect(out[1].text).toHaveLength(500);
    expect(out[3].ms).toBe(0);
    expect(sanitizeActions('nada', ids)).toEqual([]);
    expect(sanitizeActions(Array.from({ length: 80 }, () => ({ type: 'wait', ms: 1 })), ids)).toHaveLength(50);
  });

  it('escapa caracteres especiais do SendKeys e converte quebra de linha em Enter', () => {
    expect(escapeSendKeys('a+b(c)\nd{e}')).toBe('a{+}b{(}c{)}{ENTER}d{{}e{}}');
  });

  it('descreve as ações para a lista do passo', () => {
    expect(describeAction({ id: '1', type: 'click', x: 5, y: 6 })).toBe('Clique em (5, 6)');
    expect(describeAction({ id: '2', type: 'wait', ms: 250 })).toBe('Esperar 250 ms');
    expect(describeAction({ id: '3', type: 'click', x: 1, y: 2, win: { process: 'chrome', title: 't', dx: 10, dy: 20 } })).toBe('Clique em chrome (+10, +20)');
  });

  it('aceita coordenada negativa (monitor à esquerda) e guarda a janela de origem saneada', () => {
    const [click, bad] = sanitizeActions(
      [
        { type: 'click', x: -1500, y: 30, win: { process: ' chrome ', title: 'Hub', dx: 12.6, dy: -4 } },
        { type: 'click', x: 1, y: 1, win: { process: '', title: 'x', dx: 1, dy: 1 } }
      ],
      ids
    );
    expect(click).toMatchObject({ x: -1500, y: 30, win: { process: 'chrome', title: 'Hub', dx: 13, dy: -4 } });
    expect(bad.win).toBeUndefined();
  });
});

describe('evaluateChecks', () => {
  const api = { meta: '200 OK · 120 ms · 1.2 KB', response: '{"data":{"status":"OK","items":[{"id":7}]}}' };

  it('sem regras não há veredito', () => {
    expect(evaluateChecks('', api)).toBeUndefined();
    expect(evaluateChecks(undefined, api)).toBeUndefined();
  });

  it('aprova status, texto, tempo e caminho JSON', () => {
    const v = evaluateChecks('status 200\nstatus 2xx\ncontém "status":"OK"\nnao contem erro\ntempo < 500\njson data.status = OK\njson data.items[0].id = 7', api);
    expect(v?.passed).toBe(true);
    expect(v?.results).toHaveLength(7);
  });

  it('reprova com detalhe do que foi obtido', () => {
    const v = evaluateChecks('status 201\ntempo < 50\njson data.status = FALHA\ncontem sucesso', api);
    expect(v?.passed).toBe(false);
    expect(v?.results.map((r) => r.ok)).toEqual([false, false, false, false]);
    expect(v?.results[0].detail).toBe('status 200');
    expect(v?.results[2].detail).toBe('OK');
  });

  it('conta linhas do SQL e reprova regra desconhecida ou sem dado', () => {
    const sql = { meta: '3 linha(s) · 45 ms · Homolog', response: 'ID\n--\n1' };
    expect(evaluateChecks('linhas = 3\nlinhas >= 1', sql)?.passed).toBe(true);
    expect(evaluateChecks('linhas > 5', sql)?.passed).toBe(false);
    expect(evaluateChecks('banana', sql)?.results[0].detail).toMatch(/não reconhecida/);
    expect(evaluateChecks('status 200', sql)?.results[0].detail).toMatch(/Sem status/);
    expect(evaluateChecks('json a = 1', sql)?.results[0].detail).toMatch(/não é JSON/);
  });
});

describe('groupBlocks', () => {
  it('pareia antes/depois na ordem e mantém os demais soltos', () => {
    const rows = groupBlocks([block('b1', 'before'), block('s', 'single'), block('a1', 'after'), block('b2', 'before')]);
    expect(rows.map((r) => [r.before?.id, r.after?.id, r.single?.id])).toEqual([
      ['b1', 'a1', undefined],
      [undefined, undefined, 's'],
      ['b2', undefined, undefined]
    ]);
  });
});
