import { describe, expect, it } from 'vitest';
import {
  appendLogChunk,
  buildCatalogFailureMessage,
  buildDirectInstallFeature,
  buildExecutingTargetName,
  buildFeatureKey,
  filterLogLines,
  getCatalogFailureDetail,
  getLogLineClass,
  resolveEffectiveFeature,
  ROUTINE801_MAX_LOG_LINES
} from './routine801ModalUtils';
import type { Routine801Feature } from '../../../shared/types';

const makeFeature = (over: Partial<Routine801Feature> = {}): Routine801Feature => ({
  nome: 'winthor-x',
  versao: '1.0.0.0',
  codigoRotina: 1,
  codigoModulo: 2,
  tipoProjeto: 'SERVICO',
  descricao: 'x',
  status: 'LIBERADO',
  ...over
});

describe('routine801ModalUtils', () => {
  it('builds feature key', () => {
    expect(buildFeatureKey(makeFeature())).toBe('winthor-x@1.0.0.0');
  });

  it('caps log buffer', () => {
    const full = Array.from({ length: ROUTINE801_MAX_LOG_LINES }, (_, i) => String(i));
    const next = appendLogChunk(full, 'novo');
    expect(next).toHaveLength(ROUTINE801_MAX_LOG_LINES);
    expect(next[next.length - 1]).toBe('novo');
    expect(next[0]).toBe('1');
  });

  it('filters error lines', () => {
    const logs = ['ok', '[ERRO] falha', 'java Exception', 'fim'];
    expect(filterLogLines(logs, 'ALL')).toEqual(logs);
    expect(filterLogLines(logs, 'ERRORS')).toEqual(['[ERRO] falha', 'java Exception']);
  });

  it('classifies log lines by priority', () => {
    expect(getLogLineClass('[ERRO] x')).toContain('rose');
    expect(getLogLineClass('✔ feito')).toContain('emerald');
    expect(getLogLineClass('[AVISO] x')).toContain('amber');
    expect(getLogLineClass('$ feature:install')).toContain('text-primary');
    expect(getLogLineClass('texto')).toBe('text-foreground/80');
  });

  it('builds direct install feature with trimmed fields', () => {
    const f = buildDirectInstallFeature(' abc ', ' 1.2.3 ', 'ROTINA');
    expect(f).toMatchObject({ nome: 'abc', versao: '1.2.3', tipoProjeto: 'ROTINA', status: 'LIBERADO' });
    expect(f.descricao).toBe('abc (Instalação Direta)');
  });

  it('names executing target', () => {
    expect(buildExecutingTargetName([makeFeature()])).toBe('winthor-x');
    expect(buildExecutingTargetName([makeFeature(), makeFeature()])).toBe('2 artefato(s)');
  });

  it('resolves effective feature version', () => {
    expect(resolveEffectiveFeature(null, '1')).toBeNull();
    expect(resolveEffectiveFeature(makeFeature(), ' 2.0 ')?.versao).toBe('2.0');
    expect(resolveEffectiveFeature(makeFeature(), '  ')?.versao).toBe('1.0.0.0');
  });

  it('extracts failure detail preferring installs', () => {
    const ok: PromiseSettledResult<unknown> = { status: 'fulfilled', value: 1 };
    const bad = (m: string): PromiseSettledResult<unknown> => ({ status: 'rejected', reason: new Error(m) });
    expect(getCatalogFailureDetail(bad('u'), bad('i'))).toBe('i');
    expect(getCatalogFailureDetail(bad('u'), ok)).toBe('u');
    expect(getCatalogFailureDetail(ok, ok)).toBe('Não foi possível estabelecer conexão.');
    expect(buildCatalogFailureMessage('http://h', 'd')).toContain('em http://h: d.');
  });
});
