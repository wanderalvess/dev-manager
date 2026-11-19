import { describe, expect, it } from 'vitest';
import {
  describeAction,
  escapeSendKeys,
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
