import { describe, expect, it } from 'vitest';
import {
  buildSelectionFromSessionEvent,
  buildSelectionFromStatement,
  computeElapsedSec,
  formatBindsCount,
  mergeSnapshotBinds,
  type SelectedStatementInfo
} from './statementTracerUtils';

const bind = { position: 1, name: ':1', datatype: 'NUMBER', value: '42', lastCaptured: null } as any;

describe('statementTracerUtils', () => {
  it('monta seleção a partir de evento de sessão com defaults vazios', () => {
    const sel = buildSelectionFromSessionEvent({ sid: 1, serialNum: 2, capturedAt: 't' } as any);
    expect(sel.sqlId).toBe('');
    expect(sel.sqlText).toBe('');
    expect(sel.timestamp).toBe('t');
  });

  it('monta seleção a partir de statement usando schema como username', () => {
    const sel = buildSelectionFromStatement({
      sqlId: 'abc',
      sqlText: 'select 1',
      parsingSchemaName: 'SCOTT',
      lastActiveTime: 'x'
    } as any);
    expect(sel.username).toBe('SCOTT');
    expect(sel.timestamp).toBe('x');
  });

  it('mescla binds do snapshot só quando o item ainda não os tem', () => {
    const selected: SelectedStatementInfo = { sqlId: 'a', sqlText: 'q' };
    const merged = mergeSnapshotBinds(selected, [{ sqlId: 'a', binds: [bind], interpolatedSql: 'i' } as any]);
    expect(merged?.binds).toEqual([bind]);
    expect(merged?.interpolatedSql).toBe('i');
    expect(mergeSnapshotBinds({ ...selected, binds: [bind] }, [{ sqlId: 'a', binds: [bind] } as any])).toBeNull();
    expect(mergeSnapshotBinds(null, [])).toBeNull();
    expect(mergeSnapshotBinds(selected, [{ sqlId: 'b', binds: [bind] } as any])).toBeNull();
  });

  it('calcula tempo decorrido sem valores negativos', () => {
    const start = new Date(1000).toISOString();
    expect(computeElapsedSec(null, 5000)).toBe(0);
    expect(computeElapsedSec(start, 4500)).toBe(3);
    expect(computeElapsedSec(start, 0)).toBe(0);
  });

  it('formata contagem de binds', () => {
    expect(formatBindsCount(1)).toBe('1 bind');
    expect(formatBindsCount(3)).toBe('3 binds');
  });
});
